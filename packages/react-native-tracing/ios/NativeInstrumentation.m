#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(NativeInstrumentation, NativeInstrumentation, NSObject)

RCT_EXTERN_METHOD(getStartupTime:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end 