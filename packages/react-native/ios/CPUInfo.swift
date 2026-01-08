import Foundation
import Darwin

/// CPU usage monitoring for iOS
///
/// Uses task_info() to track per-process CPU usage via differential calculation.
/// First call establishes baseline and returns 0.0. Subsequent calls return CPU usage percentage.
///
/// This implementation fixes the bug in the Flutter SDK which uses system-wide CPU time
/// instead of per-process CPU time, causing incorrect percentages on multi-core devices.
@objc(CPUInfo)
public class CPUInfo: NSObject {

    // Static state for differential calculation
    private static var lastCpuTime: Double = 0.0
    private static var lastWallTime: Double = 0.0

    /// Gets current CPU usage percentage using differential calculation
    ///
    /// Returns CPU usage as a percentage (0-100). First call returns 0.0 to establish baseline.
    ///
    /// - Returns: CPU usage percentage, or -1.0 on error
    @objc public static func getCpuInfo() -> Double {
        guard let cpuTime = getProcessCpuTime(),
              let wallTime = getWallTime() else {
            return -1.0
        }

        // First call - establish baseline
        if lastCpuTime == 0.0 {
            lastCpuTime = cpuTime
            lastWallTime = wallTime
            return 0.0
        }

        // Calculate differential CPU usage
        let cpuTimeDiff = cpuTime - lastCpuTime
        let wallTimeDiff = wallTime - lastWallTime

        // Avoid division by zero
        guard wallTimeDiff > 0 else {
            return -1.0
        }

        // CPU usage percentage (0-100)
        let cpuUsagePercent = 100.0 * (cpuTimeDiff / wallTimeDiff)

        // Store current values for next call
        lastCpuTime = cpuTime
        lastWallTime = wallTime

        return cpuUsagePercent
    }

    /// Gets per-process CPU time using task_info()
    ///
    /// - Returns: Total process CPU time in seconds (user + system), or nil on error
    private static func getProcessCpuTime() -> Double? {
        var threadsList: thread_act_array_t?
        var threadsCount = mach_msg_type_number_t(0)

        let result = task_threads(mach_task_self_, &threadsList, &threadsCount)
        guard result == KERN_SUCCESS, let threads = threadsList else {
            return nil
        }

        defer {
            vm_deallocate(mach_task_self_, vm_address_t(bitPattern: threads), vm_size_t(Int(threadsCount) * MemoryLayout<thread_t>.stride))
        }

        var totalCpuTime: Double = 0.0

        for i in 0..<Int(threadsCount) {
            var threadInfo = thread_basic_info()
            var threadInfoCount = mach_msg_type_number_t(THREAD_INFO_MAX)

            let infoResult = withUnsafeMutablePointer(to: &threadInfo) {
                $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                    thread_info(threads[i], thread_flavor_t(THREAD_BASIC_INFO), $0, &threadInfoCount)
                }
            }

            guard infoResult == KERN_SUCCESS else {
                continue
            }

            // Convert thread CPU time to seconds
            let userTime = Double(threadInfo.user_time.seconds) + Double(threadInfo.user_time.microseconds) / 1_000_000.0
            let systemTime = Double(threadInfo.system_time.seconds) + Double(threadInfo.system_time.microseconds) / 1_000_000.0

            totalCpuTime += userTime + systemTime
        }

        return totalCpuTime
    }

    /// Gets current wall clock time
    ///
    /// - Returns: Current time in seconds since epoch, or nil on error
    private static func getWallTime() -> Double? {
        var currentTime = timeval(tv_sec: 0, tv_usec: 0)
        gettimeofday(&currentTime, nil)
        return Double(currentTime.tv_sec) + Double(currentTime.tv_usec) / 1_000_000.0
    }
}
