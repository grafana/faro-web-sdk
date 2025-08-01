#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface NativeInstrumentation : NSObject <RCTBridgeModule>

- (void)getStartupTime:(RCTPromiseResolveBlock)resolve
              rejecter:(RCTPromiseRejectBlock)reject;

- (void)getHasAppRestarted:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject;

@end

NS_ASSUME_NONNULL_END 