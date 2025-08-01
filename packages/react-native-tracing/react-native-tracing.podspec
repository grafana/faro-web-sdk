require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'react-native-tracing'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.authors      = package['author']
  s.homepage     = package['homepage']
  s.platform     = :ios, "11.0"
  s.source       = { :git => "https://github.com/grafana/faro-web-sdk.git", :tag => "v#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.dependency "React-Core"
  
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'CLANG_ENABLE_MODULES' => 'YES'
  }
  
  s.swift_version = '5.0'
end 