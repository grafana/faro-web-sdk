import Foundation

/// Faro React Native native module for startup timing measurement
///
/// Uses iOS sysctl() system call to query kernel for accurate process start time.
/// No manual initialization or timestamp capture needed - OS tracks this automatically!
@objc(FaroReactNative)
public class FaroReactNative: NSObject {

    /// Gets app startup duration in milliseconds using kernel process info
    ///
    /// This method queries the OS for the actual process start time via sysctl(),
    /// so no manual initialization or timestamp capture is needed in AppDelegate.
    ///
    /// Implementation ported from Faro Flutter SDK:
    /// https://github.com/grafana/faro-flutter-sdk/blob/main/ios/Classes/AppStart.swift
    ///
    /// - Returns: Duration from process start to current time in milliseconds
    @objc public static func getAppStartDuration() -> Double {
        var appStartDuration: Double = 0.0
        var kinfo = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        sysctl(&mib, u_int(mib.count), &kinfo, &size, nil, 0)

        let start_time = kinfo.kp_proc.p_starttime
        var time: timeval = timeval(tv_sec: 0, tv_usec: 0)
        gettimeofday(&time, nil)

        let currentTimeMilliseconds = Double(Int64(time.tv_sec) * 1000) + Double(time.tv_usec) / 1000.0
        let processTimeMilliseconds = Double(Int64(start_time.tv_sec) * 1000) + Double(start_time.tv_usec) / 1000.0

        appStartDuration = (currentTimeMilliseconds - processTimeMilliseconds)

        return appStartDuration
    }
}
