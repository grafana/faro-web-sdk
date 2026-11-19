import { IncrementalSource, type mutationData, NodeType } from '@grafana/rrweb-types';

import { removeChildCanvasPixels, startCanvasSnapshots } from './canvasSnapshots';

describe('canvas snapshots', () => {
  const frame = new Blob(['frame'], { type: 'image/webp' });
  const emit = jest.fn();
  let canvas: HTMLCanvasElement;
  let encoder: jest.SpyInstance<void, Parameters<HTMLCanvasElement['toBlob']>>;
  let reader: FileReader | undefined;
  let sampler: ReturnType<typeof startCanvasSnapshots>;
  let current: boolean;
  const mirror = {
    getId: (node: Node) => (node === canvas ? 17 : -1),
    getNode: (id: number) => (id === 17 ? canvas : null),
  };

  function start(blockSelector?: string) {
    sampler = startCanvasSnapshots(blockSelector, mirror, () => current, emit);
  }

  function tick() {
    jest.advanceTimersByTime(250);
  }

  function finishRead() {
    expect(reader).toBeDefined();
    const pending = reader!;
    reader = undefined;
    Object.defineProperty(pending, 'result', { value: 'data:image/webp;base64,ZnJhbWU=' });
    pending.dispatchEvent(new Event('load'));
    pending.dispatchEvent(new Event('loadend'));
  }

  beforeEach(() => {
    jest.useFakeTimers();
    current = true;
    reader = undefined;
    emit.mockClear();
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    encoder = jest.spyOn(canvas, 'toBlob').mockImplementation(() => {});
    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      reader = this;
    });
  });

  afterEach(() => {
    sampler?.stop();
    sampler = undefined;
    document.body.replaceChildren();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('samples at most four times per second at WebP quality 0.5', () => {
    encoder.mockImplementation((done) => done(frame));
    start();
    jest.advanceTimersByTime(249);
    expect(encoder).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(encoder).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.5);
    finishRead();
    for (let i = 0; i < 3; i++) {
      tick();
      finishRead();
    }
    expect(encoder).toHaveBeenCalledTimes(4);
  });

  it('emits a changed frame only once per DOM checkpoint', () => {
    encoder.mockImplementation((done) => done(frame));
    start();
    tick();
    finishRead();
    tick();
    finishRead();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 3, data: expect.objectContaining({ source: 9, id: 17 }) }),
      expect.any(Function)
    );

    sampler!.checkout();
    tick();
    finishRead();
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it.each([
    [8193, 1],
    [1, 8193],
    [8192, 2049],
    [0, 100],
  ])('skips a %i by %i surface before encoding', (width, height) => {
    canvas.width = width;
    canvas.height = height;
    start();
    tick();
    expect(encoder).not.toHaveBeenCalled();
  });

  it('fails closed for an invalid privacy selector', () => {
    start('[');
    tick();
    expect(encoder).not.toHaveBeenCalled();
  });

  it('allows only one pixel read in flight', () => {
    start();
    tick();
    jest.advanceTimersByTime(1500);
    expect(encoder).toHaveBeenCalledTimes(1);
    encoder.mock.calls[0]![0](frame);
    tick();
    expect(encoder).toHaveBeenCalledTimes(1);
    finishRead();
    tick();
    expect(encoder).toHaveBeenCalledTimes(2);
  });

  it('lets the transport recheck privacy after a user hook changes the page', () => {
    encoder.mockImplementation((done) => done(frame));
    start();
    tick();
    finishRead();
    const [, stillEligible] = emit.mock.calls[0]!;
    expect(stillEligible()).toBe(true);
    canvas.classList.add('grafana-block');
    expect(stillEligible()).toBe(false);
  });

  it.each([
    ['unsupported image type', new Blob(['frame'], { type: 'image/png' })],
    ['empty WebP', new Blob([], { type: 'image/webp' })],
    ['oversized WebP', new Blob([new Uint8Array(768 * 1024 + 1)], { type: 'image/webp' })],
    ['failed encoding', null],
  ] as const)('drops %s and allows the next sample', (_reason, rejected) => {
    encoder.mockImplementationOnce((done) => done(rejected)).mockImplementation((done) => done(frame));
    start();
    tick();
    expect(FileReader.prototype.readAsDataURL).not.toHaveBeenCalled();
    tick();
    finishRead();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('continues sampling after the browser denies pixel access', () => {
    encoder
      .mockImplementationOnce(() => {
        throw new DOMException('Pixel access denied', 'SecurityError');
      })
      .mockImplementation((done) => done(frame));
    start();
    tick();
    expect(emit).not.toHaveBeenCalled();
    tick();
    finishRead();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it.each(['blocked', 'removed', 'rotated'] as const)('discards a pending frame when %s', (reason) => {
    start('.private');
    tick();
    encoder.mock.calls[0]![0](frame);
    if (reason === 'blocked') {
      const parent = document.createElement('div');
      parent.className = 'private';
      document.body.appendChild(parent);
      parent.appendChild(canvas);
    } else if (reason === 'removed') {
      canvas.remove();
    } else {
      current = false;
    }
    finishRead();
    expect(emit).not.toHaveBeenCalled();
  });

  it('drops a late encoder callback after the recording stops', () => {
    start();
    tick();
    sampler!.stop();
    encoder.mock.calls[0]![0](frame);
    expect(FileReader.prototype.readAsDataURL).not.toHaveBeenCalled();
    tick();
    expect(encoder).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('cross-origin DOM additions', () => {
  it('removes out-of-band canvas pixels and retains ordinary image content', () => {
    const element = (tagName: string, id: number) => ({
      type: NodeType.Element as const,
      tagName,
      id,
      attributes: { rr_dataURL: 'image supplied by child' },
      childNodes: [],
    });
    const canvas = element('canvas', 20);
    const img = element('img', 21);
    const mutation: mutationData = {
      source: IncrementalSource.Mutation,
      adds: [{ parentId: 12, nextId: null, node: { ...element('div', 19), childNodes: [canvas, img] } }],
      attributes: [{ id: 20, attributes: { rr_dataURL: 'updated child image', width: '128' } }],
      texts: [],
      removes: [],
    };
    removeChildCanvasPixels(mutation, { getNode: () => null, getId: () => -1 });
    expect(canvas.attributes).toEqual({});
    expect(img.attributes.rr_dataURL).toBe('image supplied by child');
    expect(mutation.attributes[0]?.attributes).toEqual({ width: '128' });
  });
});
