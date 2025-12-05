import Foundation

/// Faro React Native native module for performance monitoring
///
/// Provides methods for monitoring:
/// - App startup time
/// - Memory usage (RSS)
/// - CPU usage (via CPUInfo helper)
///
/// Uses iOS system calls to query kernel for accurate metrics.
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

    /// Gets current memory usage in kilobytes using task_info()
    ///
    /// Measures Resident Set Size (RSS) - the amount of physical memory
    /// currently used by the app process.
    ///
    /// Implementation ported from Faro Flutter SDK:
    /// https://github.com/grafana/faro-flutter-sdk/blob/main/ios/Classes/FaroPlugin.swift
    ///
    /// - Returns: Memory usage in KB, or 0.0 on error
    @objc public static func getMemoryUsage() -> Double {
        var vmInfo = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info>.size / MemoryLayout<integer_t>.size)

        let result = withUnsafeMutablePointer(to: &vmInfo) { vmInfoPtr in
            vmInfoPtr.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { ptr in
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), ptr, &count)
            }
        }

        guard result == KERN_SUCCESS else {
            return 0.0
        }

        // resident_size is in bytes, convert to KB
        let memoryBytes = Double(vmInfo.phys_footprint)
        let memoryKB = memoryBytes / 1024.0

        return memoryKB
    }

    /// Gets current CPU usage percentage
    ///
    /// Uses differential calculation - first call returns 0.0 (baseline),
    /// subsequent calls return CPU usage percentage (0-100+).
    ///
    /// Implementation ported from Faro Flutter SDK:
    /// https://github.com/grafana/faro-flutter-sdk/blob/main/ios/Classes/CPUInfo.swift
    ///
    /// - Returns: CPU usage percentage, or -1.0 on error
    @objc public static func getCpuUsage() -> Double {
        return CPUInfo.getCpuInfo()
    }
}
