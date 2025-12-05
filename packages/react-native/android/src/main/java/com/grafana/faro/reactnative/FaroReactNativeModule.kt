package com.grafana.faro.reactnative

import android.os.Build
import android.os.Process
import android.os.SystemClock
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Faro React Native native module for startup timing measurement
 *
 * Uses Android OS APIs to get accurate process start time without
 * requiring manual initialization or timestamp capture.
 *
 * Implementation ported from Faro Flutter SDK:
 * https://github.com/grafana/faro-flutter-sdk/blob/main/android/src/main/java/com/grafana/faro/FaroPlugin.java
 */
class FaroReactNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "FaroReactNativeModule"
    }

    override fun getName(): String = NAME

    /**
     * Gets app startup duration in milliseconds using Android OS APIs
     *
     * Uses Process.getStartElapsedRealtime() which returns when the process
     * started, so no manual initialization is needed in MainActivity.
     *
     * Returns duration from process start to current time in milliseconds.
     * Returns 0 if Android version < N (API 24).
     *
     * @return Duration in milliseconds, or 0 if unsupported Android version
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getAppStartDuration(): Double {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val duration = SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
            return duration.toDouble()
        }
        return 0.0
    }
}
