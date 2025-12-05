import Foundation

/// CPU usage monitoring for iOS
///
/// Uses host_statistics() system call to track CPU usage via differential calculation.
/// First call establishes baseline and returns 0.0. Subsequent calls return CPU usage percentage.
///
/// Implementation ported from Faro Flutter SDK:
/// https://github.com/grafana/faro-flutter-sdk/blob/main/ios/Classes/CPUInfo.swift
@objc(CPUInfo)
public class CPUInfo: NSObject {

    // Static state for differential calculation
    private static var lastCpuTime: Double = 0.0
    private static var lastProcessTime: Double = 0.0
    private static let clockSpeedHz: Double = {
        let clockSpeed = sysconf(_SC_CLK_TCK)
        return clockSpeed > 0 ? Double(clockSpeed) : 100.0
    }()

    /// Gets current CPU usage percentage using differential calculation
    ///
    /// Returns CPU usage as a percentage (0-100+). First call returns 0.0 to establish baseline.
    ///
    /// - Returns: CPU usage percentage, or -1.0 on error
    @objc public static func getCpuInfo() -> Double {
        guard let cpuTime = getCpuTime(),
              let processTime = measureAppStartUpTime() else {
            return -1.0
        }

        // First call - establish baseline
        if lastCpuTime == 0.0 {
            lastCpuTime = cpuTime
            lastProcessTime = processTime
            return 0.0
        }

        // Calculate differential CPU usage
        let cpuTimeDiff = cpuTime - lastCpuTime
        let processTimeDiff = processTime - lastProcessTime

        // Avoid division by zero
        guard processTimeDiff > 0 else {
            return -1.0
        }

        let cpuUsagePercent = 100.0 * (cpuTimeDiff / processTimeDiff)

        // Store current values for next call
        lastCpuTime = cpuTime
        lastProcessTime = processTime

        return cpuUsagePercent
    }

    /// Gets host CPU load information and calculates total CPU time
    ///
    /// - Returns: Total CPU time in seconds, or nil on error
    private static func getCpuTime() -> Double? {
        var count = mach_msg_type_number_t(MemoryLayout<host_cpu_load_info>.size / MemoryLayout<integer_t>.size)
        var hostInfo = host_cpu_load_info()

        let result = withUnsafeMutablePointer(to: &hostInfo) { hostInfoPtr in
            hostInfoPtr.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { ptr in
                host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, ptr, &count)
            }
        }

        guard result == KERN_SUCCESS else {
            return nil
        }

        // Calculate total CPU time from ticks
        let userTicks = Double(hostInfo.cpu_ticks.0)
        let systemTicks = Double(hostInfo.cpu_ticks.1)
        let idleTicks = Double(hostInfo.cpu_ticks.2)
        let niceTicks = Double(hostInfo.cpu_ticks.3)

        let totalTicks = userTicks + systemTicks + idleTicks + niceTicks
        let cpuTime = totalTicks / clockSpeedHz

        return cpuTime
    }

    /// Measures time since app started using kernel process info
    ///
    /// - Returns: Process uptime in seconds, or nil on error
    private static func measureAppStartUpTime() -> Double? {
        var kinfo = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]

        let result = sysctl(&mib, u_int(mib.count), &kinfo, &size, nil, 0)
        guard result == 0 else {
            return nil
        }

        let startTime = kinfo.kp_proc.p_starttime
        var currentTime = timeval(tv_sec: 0, tv_usec: 0)
        gettimeofday(&currentTime, nil)

        let currentTimeSeconds = Double(currentTime.tv_sec) + Double(currentTime.tv_usec) / 1_000_000.0
        let processStartSeconds = Double(startTime.tv_sec) + Double(startTime.tv_usec) / 1_000_000.0

        return currentTimeSeconds - processStartSeconds
    }
}
