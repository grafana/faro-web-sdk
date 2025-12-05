package com.grafana.faro.reactnative

import android.os.Build
import android.os.Process
import android.os.SystemClock
import android.system.Os
import java.io.BufferedReader
import java.io.File
import java.io.FileReader

/**
 * CPU usage monitoring for Android
 *
 * Uses /proc/[pid]/stat file parsing to track CPU usage via differential calculation.
 * First call establishes baseline and returns 0.0. Subsequent calls return CPU usage percentage.
 *
 * Implementation ported from Faro Flutter SDK:
 * https://github.com/grafana/faro-flutter-sdk/blob/main/android/src/main/java/com/grafana/faro/CPUInfo.java
 *
 * TODO: Currently not tested in demo app due to Yarn workspace gradle path resolution issues.
 * See demo-react-native/android/settings.gradle for details. This code is complete and ready
 * to work in standalone React Native projects or once workspace gradle config is fixed.
 */
object CPUInfo {

    // Static state for differential calculation
    private var lastCpuTime: Double = 0.0
    private var lastProcessTime: Double = 0.0
    private var clockSpeedHz: Long = 0

    /**
     * Gets current CPU usage percentage using differential calculation
     *
     * Returns CPU usage as a percentage (0-100+). First call returns 0.0 to establish baseline.
     * Requires Android API 21+ (Lollipop) for Os.sysconf().
     *
     * @return CPU usage percentage, or null on error or unsupported Android version
     */
    fun getCpuInfo(): Double? {
        // Requires API 21+ for Os.sysconf
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            return null
        }

        // Initialize clock speed on first call
        if (clockSpeedHz == 0L) {
            try {
                clockSpeedHz = Os.sysconf(android.system.OsConstants._SC_CLK_TCK)
            } catch (e: Exception) {
                return null
            }
        }

        val cpuTime = getCpuTime() ?: return null
        val processTime = getProcessUptime() ?: return null

        // First call - establish baseline
        if (lastCpuTime == 0.0) {
            lastCpuTime = cpuTime
            lastProcessTime = processTime
            return 0.0
        }

        // Calculate differential CPU usage
        val cpuTimeDiff = cpuTime - lastCpuTime
        val processTimeDiff = processTime - lastProcessTime

        // Avoid division by zero
        if (processTimeDiff <= 0) {
            return null
        }

        val cpuUsagePercent = 100.0 * (cpuTimeDiff / processTimeDiff)

        // Store current values for next call
        lastCpuTime = cpuTime
        lastProcessTime = processTime

        return cpuUsagePercent
    }

    /**
     * Reads /proc/[pid]/stat and calculates total CPU time
     *
     * @return Total CPU time in seconds, or null on error
     */
    private fun getCpuTime(): Double? {
        val pid = Process.myPid()
        val statFile = File("/proc/$pid/stat")

        if (!statFile.exists() || !statFile.canRead()) {
            return null
        }

        try {
            BufferedReader(FileReader(statFile)).use { reader ->
                val line = reader.readLine() ?: return null
                val fields = line.split(" ")

                // Parse CPU time fields from /proc/[pid]/stat:
                // Field 13: utime - CPU time spent in user code
                // Field 14: stime - CPU time spent in kernel code
                // Field 15: cutime - CPU time of children in user code
                // Field 16: cstime - CPU time of children in kernel code
                if (fields.size < 17) {
                    return null
                }

                val utime = fields[13].toLongOrNull() ?: return null
                val stime = fields[14].toLongOrNull() ?: return null
                val cutime = fields[15].toLongOrNull() ?: return null
                val cstime = fields[16].toLongOrNull() ?: return null

                // Calculate total CPU time in seconds
                val totalTicks = utime + stime + cutime + cstime
                val cpuTime = totalTicks.toDouble() / clockSpeedHz.toDouble()

                return cpuTime
            }
        } catch (e: Exception) {
            return null
        }
    }

    /**
     * Calculates process uptime in seconds
     *
     * Uses startTime from /proc/[pid]/stat and SystemClock.elapsedRealtime()
     *
     * @return Process uptime in seconds, or null on error
     */
    private fun getProcessUptime(): Double? {
        // Requires API 24+ for Process.getStartElapsedRealtime()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val uptimeMs = SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
            return uptimeMs / 1000.0
        }

        // Fallback: Parse startTime from /proc/[pid]/stat
        val pid = Process.myPid()
        val statFile = File("/proc/$pid/stat")

        if (!statFile.exists() || !statFile.canRead()) {
            return null
        }

        try {
            BufferedReader(FileReader(statFile)).use { reader ->
                val line = reader.readLine() ?: return null
                val fields = line.split(" ")

                // Field 21: starttime - Time the process started after system boot (in clock ticks)
                if (fields.size < 22) {
                    return null
                }

                val startTime = fields[21].toLongOrNull() ?: return null
                val startTimeSeconds = startTime.toDouble() / clockSpeedHz.toDouble()

                // Calculate process uptime
                val uptimeSeconds = SystemClock.elapsedRealtime() / 1000.0 - startTimeSeconds

                return uptimeSeconds
            }
        } catch (e: Exception) {
            return null
        }
    }
}
