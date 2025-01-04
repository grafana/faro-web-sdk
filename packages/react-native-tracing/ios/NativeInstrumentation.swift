import Foundation
import React

@objc(NativeInstrumentation)
public class NativeInstrumentation: NSObject, RCTBridgeModule {
    private static var startTime: TimeInterval?
    private static var cachedMetrics: [String: Double]?
    
    @objc
    public static func initializeNativeInstrumentation() {
        NativeInstrumentation.cachedMetrics = nil
        NativeInstrumentation.startTime = Date().timeIntervalSince1970
    }
    
    override init() {
        super.init()
    }
    
    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    public static func moduleName() -> String! {
        return "NativeInstrumentation"
    }
    
    @objc
    public func getStartupTime(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let startTime = NativeInstrumentation.startTime else {
            reject("NO_START_TIME", "[NativeInstrumentation] Start time was not initialized", nil)
            return
        }
        
        if let metrics = NativeInstrumentation.cachedMetrics {
            resolve(metrics)
            return
        }
        
        let endTime = Date().timeIntervalSince1970
        let duration = endTime - startTime
        
        let metrics: [String: Double] = [
            "startStartupTime": startTime,
            "endStartupTime": endTime,
            "startupDuration": duration
        ]
        
        NativeInstrumentation.cachedMetrics = metrics
        resolve(metrics)
    }
}
