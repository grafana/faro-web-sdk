import { getRandomSpanId } from '../../utils';
import type { BaseObjectValue } from '../../utils';
import { SpanKind, SpanStatusCode } from './types';
import type {
  GetNewSpanOptions,
  InstrumentationLibrarySpan,
  InstrumentationLibrarySpanEvent,
  InstrumentationLibrarySpanLink,
  KeyValue,
  KeyValueValue,
  Span,
  SpanAttributes,
  SpanGeneralAttributes,
  TraceEvent,
} from './types';

const valueToKeyValueValue = (value: BaseObjectValue): KeyValueValue | null => {
  switch (typeof value) {
    case 'string':
      return {
        stringValue: value,
      };

    case 'number':
      if (Number.isNaN(value)) {
        return null;
      }

      return {
        [Number.isInteger(value) ? 'intValue' : 'doubleValue']: value,
      };

    case 'boolean':
      return {
        boolValue: value,
      };

    case 'object':
      if (Array.isArray(value)) {
        return {
          arrayValue: value.reduce((acc, innerValue) => {
            const parsedInnerValue = valueToKeyValueValue(innerValue);

            if (parsedInnerValue !== null) {
              acc.push(parsedInnerValue);
            }

            return acc;
          }, [] as KeyValueValue[]),
        };
      } else if (value !== null) {
        return {
          kvlistValue: {
            values: Object.entries(value).reduce((acc, [innerKey, innerValue]) => {
              const parsedInnerValue = valueToKeyValueValue(innerValue);

              if (parsedInnerValue !== null) {
                acc.push({
                  key: innerKey,
                  value: parsedInnerValue,
                });
              }

              return acc;
            }, [] as KeyValue[]),
          },
        };
      }

      return null;

    default:
      return null;
  }
};

export const spanGenerator = <A extends SpanAttributes = SpanGeneralAttributes>(
  traceId: string,
  onTransport: (payload: TraceEvent) => void,
  {
    instrumentationLibrary,

    attributes,
    childSpans,
    endDate,
    events,
    kind,
    links,
    name,
    parentSpan,
    startDate,
    status,
    traceState,
  }: GetNewSpanOptions<A>
): Span<A> => {
  const id = getRandomSpanId();
  let actualInstrumentationLibrary = instrumentationLibrary ?? {};

  let actualAttributes = attributes ?? ({} as A);
  let actualChildSpans = childSpans ?? [];
  let actualEndDate = endDate;
  let actualEvents = events ?? {};
  let actualKind = kind ?? SpanKind.UNSPECIFIED;
  let actualLinks = links ?? {};
  let actualName = name;
  let actualParentSpan = parentSpan;
  let actualStartDate = startDate;
  let actualStatus = status ?? {
    code: SpanStatusCode.UNSET,
  };
  let actualTraceState = traceState;

  const span: Span<A> = {} as Span<A>;

  span.addChildSpan = (childSpan) => {
    // TODO: Fix this typing
    childSpan.setParentSpan(span as any);
    actualChildSpans.push(childSpan);
  };

  span.addEvent = (eventName, eventDate, eventAttributes) => {
    if (!actualEvents[eventName]) {
      actualEvents[eventName] = {
        attributes: eventAttributes ?? {},
        date: eventDate ?? Date.now(),
        name: eventName,
      };
    }
  };

  span.addLink = (linkTraceId, linkSpanId, linkTraceState, linkAttributes) => {
    if (!actualLinks[linkTraceId]) {
      actualLinks[linkTraceId] = {};
    }

    actualLinks[linkTraceId]![linkSpanId] = {
      attributes: linkAttributes ?? {},
      spanId: linkSpanId,
      traceId: linkTraceId,
      traceState: linkTraceState,
    };
  };

  span.getAsPayload = () => {
    const instrumentationLibrarySpan: InstrumentationLibrarySpan = {
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
      name: actualName,
      spanId: id,
      traceId,
      traceState,
    };

    if (actualEndDate) {
      instrumentationLibrarySpan.endTimeUnixNano = actualEndDate;
    }

    if (actualKind !== SpanKind.UNSPECIFIED) {
      instrumentationLibrarySpan.kind = actualKind;
    }

    if (actualParentSpan) {
      instrumentationLibrarySpan.parentSpanId = actualParentSpan.getId();
    }

    if (actualStartDate) {
      instrumentationLibrarySpan.startTimeUnixNano = actualStartDate;
    }

    if (actualStatus.code !== SpanStatusCode.UNSET) {
      instrumentationLibrarySpan.status = actualStatus;
    }

    const actualAttributesEntries = Object.entries(actualAttributes);

    if (actualAttributesEntries.length > 0) {
      instrumentationLibrarySpan.attributes = actualAttributesEntries.reduce((acc, [key, value]) => {
        const parsedValue = valueToKeyValueValue(value);

        if (parsedValue !== null) {
          acc.push({
            key,
            value: parsedValue,
          });
        }

        return acc;
      }, [] as KeyValue[]);
    }

    const actualLinksValues = Object.values(actualLinks).filter(Boolean);

    if (actualLinksValues.length > 0) {
      instrumentationLibrarySpan.links = actualLinksValues.reduce((acc, traceIdSpans) => {
        const traceIdSpansValues = Object.values(traceIdSpans).filter(Boolean);

        if (traceIdSpansValues.length > 0) {
          acc.push(
            ...traceIdSpansValues.map((linkValue) => {
              const linkValueAttributesEntries = Object.entries(linkValue.attributes);

              let linkAttributes = linkValueAttributesEntries.reduce((acc, [key, value]) => {
                const parsedValue = valueToKeyValueValue(value);

                if (parsedValue !== null) {
                  acc.push({
                    key,
                    value: parsedValue,
                  });
                }

                return acc;
              }, [] as KeyValue[]);

              return {
                ...linkValue,
                attributes: linkAttributes,
                droppedAttributesCount: 0,
              };
            })
          );
        }

        return acc;
      }, [] as InstrumentationLibrarySpanLink[]);
    }

    const actualEventsValues = Object.values(actualEvents).filter(Boolean);

    if (actualEventsValues.length > 0) {
      instrumentationLibrarySpan.events = actualEventsValues.reduce((acc, spanEvent) => {
        const eventAttributesEntries = Object.entries(spanEvent.attributes);

        let eventAttributes = eventAttributesEntries.reduce((acc, [key, value]) => {
          const parsedValue = valueToKeyValueValue(value);

          if (parsedValue !== null) {
            acc.push({
              key,
              value: parsedValue,
            });
          }

          return acc;
        }, [] as KeyValue[]);

        acc.push({
          attributes: eventAttributes,
          droppedAttributesCount: 0,
          name: spanEvent.name,
          timeUnixNano: spanEvent.date,
        });

        return acc;
      }, [] as InstrumentationLibrarySpanEvent[]);
    }

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [],
            droppedAttributesCount: 0,
          },
          spans: [
            {
              instrumentationLibrary: actualInstrumentationLibrary,
              spans: [instrumentationLibrarySpan],
            },
          ],
        },
      ],
    };
  };

  span.getAttribute = (key) => actualAttributes[key];

  span.getAttributes = () => actualAttributes;

  span.getChildSpan = (spanId) => actualChildSpans.find((span) => span.getId() === spanId) ?? undefined;

  span.getChildSpans = () => actualChildSpans;

  span.getEndDate = () => actualEndDate;

  span.getEvent = (eventName) => actualEvents[eventName];

  span.getId = () => id;

  span.getKind = () => actualKind;

  span.getLink = (traceId, spanId) => actualLinks[traceId]?.[spanId];

  span.getName = () => actualName;

  span.getParentSpan = () => actualParentSpan;

  span.getStartDate = () => actualStartDate;

  span.getStatus = () => actualStatus;

  span.getTraceId = () => traceId;

  span.getTraceState = () => actualTraceState;

  span.isRootSpan = () => actualParentSpan === undefined;

  span.setAttribute = (attributeName, attributeValue) => {
    actualAttributes[attributeName] = attributeValue;
  };

  span.setEndDate = (newEndDate) => {
    actualEndDate = newEndDate;
  };

  span.setEventAttribute = (eventName, attributeName, attributeValue) => {
    if (actualEvents[eventName]) {
      actualEvents[eventName]!.attributes[attributeName] = attributeValue;
    }
  };

  span.setKind = (newKind) => {
    actualKind = newKind;
  };

  span.setLinkAttribute = (traceId, spanId, attributeName, attributeValue) => {
    if (actualLinks[traceId]?.[spanId]) {
      actualLinks[traceId]![spanId]!.attributes[attributeName] = attributeValue;
    }
  };

  span.setName = (newName) => {
    actualName = newName;
  };

  span.setParentSpan = (newParentSpan) => {
    actualParentSpan = newParentSpan;
  };

  span.setInstrumentationLibrary = (instrumentationLibraryName, instrumentationLibraryVersion) => {
    actualInstrumentationLibrary = {
      name: instrumentationLibraryName,
    };

    if (instrumentationLibraryVersion) {
      actualInstrumentationLibrary.version = instrumentationLibraryVersion;
    }
  };

  span.setStartDate = (newStartDate) => {
    actualStartDate = newStartDate;
  };

  span.setStatus = (newStatusCode, newStatusMessage) => {
    actualStatus = {
      code: newStatusCode,
    };

    if (newStatusMessage) {
      actualStatus.message = newStatusMessage;
    }
  };

  span.setTraceState = (newTraceState) => {
    actualTraceState = newTraceState;
  };

  span.transport = () => {
    onTransport(span.getAsPayload());
  };

  span.unsetAttribute = (attributeName) => {
    delete actualAttributes[attributeName];
  };

  span.unsetAttributes = () => {
    actualAttributes = {} as A;
  };

  span.unsetEventAttribute = (eventName, attributeName) => {
    if (actualEvents[eventName]) {
      delete actualEvents[eventName]!.attributes[attributeName];
    }
  };

  span.unsetEventAttributes = (eventName) => {
    if (actualEvents[eventName]) {
      actualEvents[eventName]!.attributes = {};
    }
  };

  span.unsetLinkAttribute = (traceId, spanId, attributeName) => {
    if (actualLinks[traceId]?.[spanId]) {
      delete actualLinks[traceId]![spanId]!.attributes[attributeName];
    }
  };

  span.unsetLinkAttributes = (traceId, spanId) => {
    if (actualLinks[traceId]?.[spanId]) {
      actualLinks[traceId]![spanId]!.attributes = {};
    }
  };

  return span;
};
