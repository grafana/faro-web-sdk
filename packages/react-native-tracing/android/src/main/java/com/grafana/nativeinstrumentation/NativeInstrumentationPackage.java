package com.grafana.nativeinstrumentation;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class NativeInstrumentationPackage implements ReactPackage {
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        android.util.Log.d("NativeInstrumentation", "Creating view managers (none needed)");
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        android.util.Log.d("NativeInstrumentation", "Creating native modules");
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new NativeInstrumentationModule(reactContext));
        android.util.Log.d("NativeInstrumentation", "Native instrumentation module added to modules list");
        return modules;
    }
} 