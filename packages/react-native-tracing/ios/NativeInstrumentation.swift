import Foundation
import React

@objc(NativeInstrumentation)
public class NativeInstrumentation: NSObject, RCTBridgeModule {
    private static var hasAppRestarted: Bool = false
    
    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    public static func moduleName() -> String! {
        return "NativeInstrumentation"
    }
    
    override init() {
        super.init()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleBundleLoadStart(_:)),
            name: NSNotification.Name("RCTJavaScriptWillStartLoadingNotification"),
            object: nil
        )
    }
    
    @objc private func handleBundleLoadStart(_ notification: Notification) {
        if NativeInstrumentation.hasAppRestarted {
            return
        }

        NativeInstrumentation.hasAppRestarted = true
    }
    
    @objc
    public func getStartupTime(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        var mib = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        var size = MemoryLayout<kinfo_proc>.size
        var kp = kinfo_proc()
        
        let result = mib.withUnsafeMutableBytes { mibBytes in
            withUnsafeMutablePointer(to: &size) { sizeBytes in
                withUnsafeMutablePointer(to: &kp) { kpBytes in
                    sysctl(mibBytes.baseAddress?.assumingMemoryBound(to: Int32.self), 4,
                           kpBytes,
                           sizeBytes,
                           nil, 0)
                }
            }
        }
        
        let startTimeMs: Int64
        if result == 0 {
            let startTime = kp.kp_proc.p_un.__p_starttime
            startTimeMs = Int64(startTime.tv_sec) * 1000 + Int64(startTime.tv_usec) / 1000
        } else {
            startTimeMs = Int64(Date().timeIntervalSince1970 * 1000)
        }
        
        let response = ["startupTime": startTimeMs]
        resolve(response)
    }
    
    @objc
    public func getHasAppRestarted(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(NativeInstrumentation.hasAppRestarted)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
