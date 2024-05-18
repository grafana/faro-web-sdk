import type { MetricWithAttribution } from 'web-vitals/attribution'

import { initializeFaro, MeasurementEvent, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';


import { WebVitalsWithAttributionInstrumentation } from './instrumentation';

jest.mock('web-vitals/attribution', () => {
    type MetricName =  MetricWithAttribution['name'];
    type MetricAttribution = MetricWithAttribution['attribution'];

    function createMetric(name: MetricName, attribution: MetricAttribution): MetricWithAttribution {
        return {
            name,
            value: 0.1,
            rating: 'good',
            delta: 0.1,
            id: 'id',
            entries: [],
            navigationType: 'navigate',
            attribution,
        };
    }

    return {
        onCLS: (cb: (metric: MetricWithAttribution) => void) => {
            cb(createMetric('CLS', {
                largestShiftValue: 0.1,
                largestShiftTime: 0.1,
                loadState: 'load',
                largestShiftTarget: 'target',
                largestShiftEntry: {
                    value: 0.1,
                },
            }));
        },
        onFCP: (cb: (metric: MetricWithAttribution) => void) => {
            cb(createMetric('FCP', {
                firstByteToFCP: 0.1,
                timeToFirstByte: 0.1,
                loadState: 'load',
            }));
        },
        onFID: (cb: (metric: MetricWithAttribution) => void) => {
            cb(createMetric('FID', {
                eventTime: 0.1,
                eventTarget: 'target',
                eventType: 'type',
                loadState: 'load',
            }));
        },
        onLCP: (cb: (metric: MetricWithAttribution) => void) => {
            cb(createMetric('LCP', {
                elementRenderDelay: 0.1,
                resourceLoadDelay: 0.1,
                resourceLoadTime: 0.1,
                timeToFirstByte: 0.1,
                element: 'element',
            }));
        },
        onTTFB: (cb: (metric: MetricWithAttribution) => void) => {
            cb(createMetric('TTFB', {
                dnsTime: 0.1,
                // intentionally removed to test when not present
                // connectionTime: 0.1,
                requestTime: 0.1,
                waitingTime: 0.1,
            }));
        },
        onINP: (cb: (metric: MetricWithAttribution) => void) => {
            cb(createMetric('INP', {
                eventTime: 0.1,
                eventTarget: 'target',
                eventType: 'type',
                loadState: 'load',
            }));
        },
    };
});

describe('WebVitalsWithAttributionInstrumentation', () => {
    it('send cls metrics correctly', () => {
        const transport = new MockTransport();

        initializeFaro(
            mockConfig({
                transports: [transport],
                instrumentations: [new WebVitalsWithAttributionInstrumentation()],
            })
        );

        const clsEvent = findTransportItemByMetricName(transport, 'cls');

        expect(clsEvent).not.toBeUndefined()

        expect(clsEvent.payload.values).toMatchObject({
            cls: 0.1,
            largest_shift_value: 0.1,
            largest_shift_time: 0.1,
            largest_shift_entry: 0.1,
        })

        expect(clsEvent.payload.context).toMatchObject({
            largest_shift_target: 'target',
            load_state: 'load',
            rating: 'good',
        })
    });

    it('send fcp metrics correctly', () => {
        const transport = new MockTransport();

        initializeFaro(
            mockConfig({
                transports: [transport],
                instrumentations: [new WebVitalsWithAttributionInstrumentation()],
            })
        );

        const fcpEvent = findTransportItemByMetricName(transport, 'fcp');

        expect(fcpEvent).not.toBeUndefined()

        expect(fcpEvent.payload.values).toMatchObject({
            fcp: 0.1,
            first_byte_to_fcp: 0.1,
            time_to_first_byte: 0.1,
        })

        expect(fcpEvent.payload.context).toMatchObject({
            rating: 'good',
            load_state: 'load',
        })
    });

    it('send fid metrics correctly', () => {
        const transport = new MockTransport();

        initializeFaro(
            mockConfig({
                transports: [transport],
                instrumentations: [new WebVitalsWithAttributionInstrumentation()],
            })
        );

        const fidEvent = findTransportItemByMetricName(transport, 'fid');

        expect(fidEvent).not.toBeUndefined()

        expect(fidEvent.payload.values).toMatchObject({
            fid: 0.1,
            event_time: 0.1,
        })

        expect(fidEvent.payload.context).toMatchObject({
            rating: 'good',
            event_target: 'target',
            event_type: 'type',
            load_state: 'load',
        })
    });

    it('send inp metrics correctly', () => {
        const transport = new MockTransport();

        initializeFaro(
            mockConfig({
                transports: [transport],
                instrumentations: [new WebVitalsWithAttributionInstrumentation()],
            })
        );

        const inpEvent = findTransportItemByMetricName(transport, 'inp');

        expect(inpEvent).not.toBeUndefined()

        expect(inpEvent.payload.values).toMatchObject({
            inp: 0.1,
            event_time: 0.1,
        })

        expect(inpEvent.payload.context).toMatchObject({
            rating: 'good',
            event_target: 'target',
            event_type: 'type',
            load_state: 'load',
        })
    });

    it('send lcp metrics correctly', () => {
        const transport = new MockTransport();

        initializeFaro(
            mockConfig({
                transports: [transport],
                instrumentations: [new WebVitalsWithAttributionInstrumentation()],
            })
        );

        const lcpEvent = findTransportItemByMetricName(transport, 'lcp');

        expect(lcpEvent).not.toBeUndefined()

        expect(lcpEvent.payload.values).toMatchObject({
            lcp: 0.1,
            element_render_delay: 0.1,
            resource_load_delay: 0.1,
            resource_load_time: 0.1,
            time_to_first_byte: 0.1,
        })

        expect(lcpEvent.payload.context).toMatchObject({
            rating: 'good',
            element: 'element',
        })
    });

    it('send ttfb metrics correctly', () => {
        const transport = new MockTransport();

        initializeFaro(
            mockConfig({
                transports: [transport],
                instrumentations: [new WebVitalsWithAttributionInstrumentation()],
            })
        );

        const ttfbEvent = findTransportItemByMetricName(transport, 'ttfb');

        expect(ttfbEvent).not.toBeUndefined()

        expect(ttfbEvent.payload.values).toMatchObject({
            ttfb: 0.1,
            dns_time: 0.1,
            // intentionally removed to test when not present
            // connection_time: 0.1,
            request_time: 0.1,
            waiting_time: 0.1,
        })

        expect(ttfbEvent.payload.context).toMatchObject({
            rating: 'good',
        })
    });

    function findTransportItemByMetricName(transport: MockTransport, name: string): TransportItem<MeasurementEvent> {
        return transport.items.find(
            (item) =>
                (item as TransportItem<MeasurementEvent>).payload.values?.[name]
        ) as TransportItem<MeasurementEvent>
    }
});
