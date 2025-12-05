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

@end
