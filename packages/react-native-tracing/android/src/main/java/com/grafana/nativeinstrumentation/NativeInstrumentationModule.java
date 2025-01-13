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

@ReactModule(name = NativeInstrumentationModule.NAME)
public class NativeInstrumentationModule extends ReactContextBaseJavaModule implements RCTEventEmitter {
    public static final String NAME = "NativeInstrumentation";
    private static Long startTime = null;

    private static Double cachedStartStartupTime = null;
    private static Double cachedEndStartupTime = null;
    private static Double cachedStartupDuration = null;

    static {
        ReactMarker.addListener((name, tag, instanceKey) -> {
            long currentTime = System.currentTimeMillis();

            if (name == ReactMarkerConstants.PRE_RUN_JS_BUNDLE_START) {
                android.util.Log.d(NAME, String.format("JS bundle load started at: %d", currentTime));
                initializeNativeInstrumentation();
            }
        });
    }

    public NativeInstrumentationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        android.util.Log.d(NAME, "Module constructor called");
    }

    @Override
    public String getName() {
        return NAME;
    }

    public static void initializeNativeInstrumentation() {
        android.util.Log.d(NAME, "Initializing native instrumentation...");
        cachedStartStartupTime = null;
        cachedEndStartupTime = null;
        cachedStartupDuration = null;
        startTime = System.currentTimeMillis();
        android.util.Log.d(NAME, String.format("Initialized with start time: %d (previous metrics cleared)", startTime));
    }

    /**
     * Creates a fresh WritableMap with startup metrics.
     * Note: Each WritableMap can only be consumed once when passed through the React Native bridge.
     * This method ensures we always create a new instance for each request.
     * 
     * Each map can be consumed once by the JS side (i.e., going through the bridge).
     *
     * @return A new WritableMap instance containing the startup metrics
     */
    private WritableMap createStartupMetricsMap(double startStartupTime, double endStartupTime, double startupDuration) {
        WritableMap params = Arguments.createMap();
        params.putDouble("startStartupTime", startStartupTime);
        params.putDouble("endStartupTime", endStartupTime);
        params.putDouble("startupDuration", startupDuration);
        return params;
    }

    @ReactMethod
    public void getStartupTime(Promise promise) {
        android.util.Log.d(NAME, "Getting startup time...");

        if (startTime == null) {
            android.util.Log.e(NAME, "Error: Start time was not initialized");
            promise.reject("NO_START_TIME", "[NativeInstrumentation] Start time was not initialized");
            return;
        }

        if (cachedStartupDuration != null) {
            android.util.Log.d(NAME, "Returning cached metrics");
            promise.resolve(createStartupMetricsMap(cachedStartStartupTime, cachedEndStartupTime, cachedStartupDuration));
            return;
        }

        long endTime = System.currentTimeMillis();
        double duration = (endTime - startTime) / 1000.0;

        android.util.Log.d(NAME, String.format(
            "Calculating metrics - Start: %d, End: %d, Duration: %f seconds",
            startTime, endTime, duration
        ));

        cachedStartStartupTime = (double) startTime;
        cachedEndStartupTime = (double) endTime;
        cachedStartupDuration = duration;

        android.util.Log.d(NAME, "Metrics cached and being returned");
        promise.resolve(createStartupMetricsMap(cachedStartStartupTime, cachedEndStartupTime, cachedStartupDuration));
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