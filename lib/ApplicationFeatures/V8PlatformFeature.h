////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2016 ArangoDB GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Dr. Frank Celler
////////////////////////////////////////////////////////////////////////////////

#ifndef APPLICATION_FEATURES_V8PLATFORM_FEATURE_H
#define APPLICATION_FEATURES_V8PLATFORM_FEATURE_H 1

#include "ApplicationFeatures/ApplicationFeature.h"

#include <v8.h>
#include <libplatform/libplatform.h>

namespace arangodb {

class ArrayBufferAllocator : public v8::ArrayBuffer::Allocator {
 public:
  virtual void* Allocate(size_t length) override {
    void* data = AllocateUninitialized(length);
    return data == nullptr ? data : memset(data, 0, length);
  }
  virtual void* AllocateUninitialized(size_t length) override { return malloc(length); }
  virtual void Free(void* data, size_t) override { free(data); }
};

class V8PlatformFeature final : public application_features::ApplicationFeature {
 public:
  explicit V8PlatformFeature(application_features::ApplicationServer* server);

 public:
  void collectOptions(std::shared_ptr<options::ProgramOptions>) override;
  void start() override;
  void stop() override;

  v8::ArrayBuffer::Allocator* arrayBufferAllocator() const { return _allocator.get(); }

 private:
  std::string _v8options;

 private:
  std::unique_ptr<v8::Platform> _platform;
  std::unique_ptr<v8::ArrayBuffer::Allocator> _allocator;
};
}

#endif
