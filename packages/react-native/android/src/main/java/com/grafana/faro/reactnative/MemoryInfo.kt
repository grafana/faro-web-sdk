package com.grafana.faro.reactnative

import android.os.Process
import java.io.BufferedReader
import java.io.File
import java.io.FileReader
import java.util.regex.Pattern

/**
 * Memory usage monitoring for Android
 *
 * Uses /proc/[pid]/status file parsing to track memory usage (VmRSS).
 * Returns instantaneous memory usage in kilobytes.
 *
 * Implementation ported from Faro Flutter SDK:
 * https://github.com/grafana/faro-flutter-sdk/blob/main/android/src/main/java/com/grafana/faro/MemoryUsageInfo.java
 *
 * TODO: Currently not tested in demo app due to Yarn workspace gradle path resolution issues.
 * See demo-react-native/android/settings.gradle for details. This code is complete and ready
 * to work in standalone React Native projects or once workspace gradle config is fixed.
 */
object MemoryInfo {

    // Regex pattern to match VmRSS line in /proc/[pid]/status
    // Example line: "VmRSS:     12345 kB"
    private val vmRssPattern = Pattern.compile("VmRSS:\\s+(\\d+) kB")

    /**
     * Gets current memory usage in kilobytes
     *
     * Reads VmRSS (Virtual Memory Resident Set Size) from /proc/[pid]/status.
     * This represents the actual physical memory currently used by the process.
     *
     * @return Memory usage in KB, or null on error
     */
    fun getMemoryUsage(): Double? {
        val pid = Process.myPid()
        val statusFile = File("/proc/$pid/status")

        if (!statusFile.exists() || !statusFile.canRead()) {
            return null
        }

        try {
            BufferedReader(FileReader(statusFile)).use { reader ->
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    val matcher = vmRssPattern.matcher(line!!)
                    if (matcher.find()) {
                        val memoryKB = matcher.group(1)?.toDoubleOrNull()
                        return memoryKB
                    }
                }
            }
        } catch (e: Exception) {
            return null
        }

        return null
    }
}
