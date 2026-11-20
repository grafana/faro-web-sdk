import {
  CanvasContext,
  EventType,
  type eventWithTime,
  IncrementalSource,
  type mutationData,
} from '@grafana/rrweb-types';

const mimeType = 'image/webp';
const framesPerSecond = 4;
const webpQuality = 0.5;
const dataPrefix = 'data:image/webp;base64,';
const maxEdge = 8192;
const maxPixels = 16_777_216;
const maxImageBytes = 768 * 1024;

interface CanvasMirror {
  getId(node: Node): number;
  getNode(id: number): Node | null;
}

// Cross-origin child recorders can have different canvas settings. Their full
// checkpoints arrive as DOM additions in the parent recorder.
export function removeChildCanvasPixels(mutation: mutationData, mirror: CanvasMirror): void {
  for (const update of mutation.attributes) {
    if ('rr_dataURL' in update.attributes) {
      const node = mirror.getNode(update.id);
      if (!node || node.nodeName.toLowerCase() === 'canvas') {
        delete update.attributes['rr_dataURL'];
      }
    }
  }
  const nodes = mutation.adds.map((add) => add.node);
  while (nodes.length) {
    const node = nodes.pop()!;
    if ('tagName' in node && node.tagName === 'canvas') {
      delete node.attributes['rr_dataURL'];
    }
    if ('childNodes' in node) {
      for (const child of node.childNodes) {
        nodes.push(child);
      }
    }
  }
}

function frameEvent(id: number, width: number, height: number, base64: string): eventWithTime {
  const blob = { rr_type: 'Blob', type: mimeType, data: [{ rr_type: 'ArrayBuffer', base64 }] };
  return {
    type: EventType.IncrementalSnapshot,
    timestamp: Date.now(),
    data: {
      source: IncrementalSource.CanvasMutation,
      type: CanvasContext['2D'],
      id,
      commands: [
        { property: 'clearRect', args: [0, 0, width, height] },
        { property: 'drawImage', args: [{ rr_type: 'ImageBitmap', args: [blob] }, 0, 0] },
      ],
    },
  };
}

export function startCanvasSnapshots(
  blockSelector: string | undefined,
  mirror: CanvasMirror,
  isCurrent: () => boolean,
  emit: (event: eventWithTime, stillEligible: () => boolean) => void
): { stop(): void; checkout(): void } | undefined {
  if (
    window.top !== window ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.toBlob !== 'function' ||
    typeof FileReader === 'undefined'
  ) {
    return;
  }

  const selector = blockSelector ? `.grafana-block,${blockSelector}` : '.grafana-block';
  try {
    document.documentElement.matches(selector);
  } catch {
    return;
  }

  const canvases = document.getElementsByTagName('canvas');
  const lastFrames = new Map<number, string>();
  let next = 0;
  let epoch = 0;
  let stopped = false;
  let busy = false;
  let reader: FileReader | undefined;

  function eligible(canvas: HTMLCanvasElement): boolean {
    if (stopped || document.hidden || !isCurrent() || canvas.getRootNode() !== document || canvas.closest(selector)) {
      return false;
    }
    // Slotted content can be displayed under a blocked ancestor in a shadow tree.
    for (let node: Element | null = canvas; node; node = node.parentElement) {
      if (node.assignedSlot) {
        return false;
      }
    }
    return true;
  }

  function sample(canvas: HTMLCanvasElement, id: number): void {
    const { width, height } = canvas;
    if (!width || !height || width > maxEdge || height > maxEdge || width * height > maxPixels) {
      return;
    }
    const checkout = epoch;
    const stillEligible = () =>
      epoch === checkout &&
      eligible(canvas) &&
      canvas.width === width &&
      canvas.height === height &&
      mirror.getNode(id) === canvas;
    busy = true;
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.type !== mimeType || !blob.size || blob.size > maxImageBytes || !stillEligible()) {
            busy = false;
            return;
          }
          const pending = new FileReader();
          reader = pending;
          pending.onloadend = () => {
            reader = undefined;
            busy = false;
            const data = pending.result;
            if (
              !stillEligible() ||
              typeof data !== 'string' ||
              !data.startsWith(dataPrefix) ||
              data === lastFrames.get(id)
            ) {
              return;
            }
            // Bound retained encoded images even on pages that add canvases indefinitely.
            lastFrames.delete(id);
            if (lastFrames.size === 4) {
              lastFrames.delete(lastFrames.keys().next().value!);
            }
            lastFrames.set(id, data);
            emit(frameEvent(id, width, height, data.slice(dataPrefix.length)), stillEligible);
          };
          try {
            pending.readAsDataURL(blob);
          } catch {
            reader = undefined;
            busy = false;
          }
        },
        mimeType,
        webpQuality
      );
    } catch {
      // A cross-origin or detached backing store may reject pixel access.
      busy = false;
    }
  }

  const timer = window.setInterval(() => {
    if (busy || stopped || document.hidden || !isCurrent()) {
      return;
    }
    const count = canvases.length;
    for (let scanned = 0; scanned < Math.min(32, count); scanned++) {
      next %= count;
      const canvas = canvases[next++]!;
      const id = mirror.getId(canvas);
      if (id > 0 && eligible(canvas) && mirror.getNode(id) === canvas) {
        sample(canvas, id);
        break;
      }
    }
  }, 1000 / framesPerSecond);

  return {
    checkout() {
      epoch++;
      lastFrames.clear();
    },
    stop() {
      stopped = true;
      window.clearInterval(timer);
      lastFrames.clear();
      reader?.abort();
    },
  };
}
