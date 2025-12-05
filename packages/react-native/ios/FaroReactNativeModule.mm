#import "FaroReactNativeModule.h"
#import <React/RCTBridgeModule.h>
#import "FaroReactNative-Swift.h"

@implementation FaroReactNativeModule

RCT_EXPORT_MODULE(FaroReactNativeModule)

/// Synchronous method for immediate access from JavaScript
/// Returns app startup duration in milliseconds from process start to current time
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getAppStartDuration)
{
  return @([FaroReactNative getAppStartDuration]);
}

/// Synchronous method for immediate access from JavaScript
/// Returns current memory usage in kilobytes (RSS)
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getMemoryUsage)
{
  return @([FaroReactNative getMemoryUsage]);
}

/// Synchronous method for immediate access from JavaScript
/// Returns current CPU usage percentage (0-100+), or -1 on error
/// First call returns 0 (baseline), subsequent calls return actual usage
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getCpuUsage)
{
  double cpuUsage = [FaroReactNative getCpuUsage];
  // Return null for error case (-1.0) to match JavaScript expectations
  return cpuUsage < 0 ? [NSNull null] : @(cpuUsage);
}

@end
