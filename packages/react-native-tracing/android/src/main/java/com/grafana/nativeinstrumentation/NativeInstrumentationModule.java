package com.grafana.nativeinstrumentation;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import android.os.Process;
import android.os.SystemClock;
import java.math.BigInteger;
import android.util.Log;

@ReactModule(name = NativeInstrumentationModule.NAME)
public class NativeInstrumentationModule extends ReactContextBaseJavaModule implements RCTEventEmitter {
    private static boolean hasAppRestarted = false;
    private static int bundleLoadCounter = 0;

    static {
        ReactMarker.addListener((name, tag, instanceKey) -> {
            if (name == ReactMarkerConstants.PRE_RUN_JS_BUNDLE_START) {
                if (!hasAppRestarted) {
                    if (bundleLoadCounter > 0) {
                        hasAppRestarted = true;
                    }
                    bundleLoadCounter++;
                }
            }
        });
    }

    public NativeInstrumentationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public double getStartupTimeSync() throws Exception {
        try {
            long currentTime = System.currentTimeMillis();
            long processStartTime = Process.getStartUptimeMillis();
            long currentUptime = SystemClock.uptimeMillis();

            long startupTime = currentTime - currentUptime + processStartTime;

            return BigInteger.valueOf(startupTime).doubleValue();
        } catch (Exception e) {
            Log.e(NAME, "Error calculating startup time", e);

            throw e;
        }
    }

    @ReactMethod
    public void getStartupTime(Promise promise) {
        try {
            WritableMap response = Arguments.createMap();

            double startupTime = getStartupTimeSync();

            response.putDouble("startupTime", startupTime);

            promise.resolve(response);
        } catch (Exception e) {
            promise.reject("STARTUP_TIME_ERROR", "Failed to get startup time: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void getHasAppRestarted(Promise promise) {
        promise.resolve(hasAppRestarted);
    }

    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(Integer count) {}

    @Override
    public void receiveTouches(String eventName, WritableArray touches, WritableArray changedIndices) {
    }

    @Override
    public void receiveEvent(int targetTag, String eventName, WritableMap event) {
    }
} 