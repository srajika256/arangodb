// Copyright 2016 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Flags: --expose-wasm

load("test/mjsunit/wasm/wasm-constants.js");
load("test/mjsunit/wasm/wasm-module-builder.js");

(function TestOne() {
  print("TestOne");
  let memory = new WebAssembly.Memory({initial: 1});
  assertEquals(kPageSize, memory.buffer.byteLength);
  let i32 = new Int32Array(memory.buffer);
  let builder = new WasmModuleBuilder();
  builder.addImportedMemory("mod", "mine");
  builder.addFunction("main", kSig_i_v)
    .addBody([
      kExprI32Const, 0,
      kExprI32LoadMem, 0, 0])
    .exportAs("main");

  let main = builder.instantiate({mod: {mine: memory}}).exports.main;
  assertEquals(0, main());

  i32[0] = 993377;

  assertEquals(993377, main());
})();

(function TestIdentity() {
  print("TestIdentity");
  let memory = new WebAssembly.Memory({initial: 1});
  let i32 = new Int32Array(memory.buffer);
  let builder = new WasmModuleBuilder();
  builder.addImportedMemory("dad", "garg");
  builder.exportMemoryAs("daggle");

  let instance = builder.instantiate({dad: {garg: memory}});
  assertSame(memory, instance.exports.daggle);
})();

(function TestImportExport() {
  print("TestImportExport");
  var i1;
  {
    let builder = new WasmModuleBuilder();
    builder.addMemory(1, 1, false);
    builder.exportMemoryAs("exported_mem");
    builder.addFunction("foo", kSig_i_i)
      .addBody([
        kExprGetLocal, 0,
        kExprI32LoadMem, 0, 0])
      .exportAs("foo");
    i1 = builder.instantiate();
  }

  var i2;
  {
    let builder = new WasmModuleBuilder();
    builder.addMemory(1, 1, false);
    builder.addImportedMemory("fil", "imported_mem");
    builder.addFunction("bar", kSig_i_i)
      .addBody([
        kExprGetLocal, 0,
        kExprI32LoadMem, 0, 0])
      .exportAs("bar");
    i2 = builder.instantiate({fil: {imported_mem: i1.exports.exported_mem}});
  }

  let i32 = new Int32Array(i1.exports.exported_mem.buffer);

  for (var i = 0; i < 1e11; i = i * 3 + 5) {
    for (var j = 0; j < 10; j++) {
      var val = i + 99077 + j;
      i32[j] = val;
      assertEquals(val | 0, i1.exports.foo(j * 4));
      assertEquals(val | 0, i2.exports.bar(j * 4));
    }
  }
})();

(function ValidateBoundsCheck() {
  print("ValidateBoundsCheck");
  let memory = new WebAssembly.Memory({initial: 1, maximum: 5});
  assertEquals(kPageSize, memory.buffer.byteLength);
  let i32 = new Int32Array(memory.buffer);
  let builder = new WasmModuleBuilder();
  builder.addImportedMemory("gaz", "mine");
  builder.addFunction("load", kSig_i_i)
      .addBody([kExprGetLocal, 0, kExprI32LoadMem, 0, 0])
      .exportFunc();
  builder.addFunction("store", kSig_i_ii)
      .addBody([kExprGetLocal, 0, kExprGetLocal, 1, kExprI32StoreMem, 0, 0,
                kExprGetLocal, 1])
      .exportFunc();
  var offset;
  let instance = builder.instantiate({gaz: {mine: memory}});
  function load() { return instance.exports.load(offset); }
  function store(value) { return instance.exports.store(offset, value); }

  for (offset = 0; offset < kPageSize - 3; offset+=4) {
    store(offset);
  }
  for (offset = 0; offset < kPageSize - 3; offset+=4) {
    assertEquals(offset, load());
  }
  for (offset = kPageSize - 3; offset < kPageSize + 4; offset++) {
    assertTraps(kTrapMemOutOfBounds, load);
  }
})();

(function TestGrowMemoryMaxDesc() {
  print("MaximumDescriptor");
  let memory = new WebAssembly.Memory({initial: 1, maximum: 5});
  assertEquals(kPageSize, memory.buffer.byteLength);
  let i32 = new Int32Array(memory.buffer);
  let builder = new WasmModuleBuilder();
  builder.addImportedMemory("mine", "dog", 0, 20);
  builder.addFunction("load", kSig_i_i)
      .addBody([kExprGetLocal, 0, kExprI32LoadMem, 0, 0])
      .exportFunc();
  builder.addFunction("store", kSig_i_ii)
      .addBody([kExprGetLocal, 0, kExprGetLocal, 1, kExprI32StoreMem, 0, 0,
                kExprGetLocal, 1])
      .exportFunc();
  var offset;
  let instance = builder.instantiate({mine: {dog: memory}});
  function load() { return instance.exports.load(offset); }
  function store(value) { return instance.exports.store(offset, value); }

  for (var i = 1; i < 5; i++) {
    for (offset = (i - 1) * kPageSize; offset < i * kPageSize - 3; offset+=4) {
      store(offset * 2);
    }
    assertEquals(i, memory.grow(1));
    assertEquals((i + 1) * kPageSize, memory.buffer.byteLength);
  }
  for (offset = 4 * kPageSize; offset < 5 * kPageSize - 3; offset+=4) {
    store(offset * 2);
  }
  for (offset = 0; offset < 5 * kPageSize - 3; offset+=4) {
    assertEquals(offset * 2, load());
  }
  for (offset = 5 * kPageSize; offset < 5 * kPageSize + 4; offset++) {
    assertThrows(load);
  }
  assertThrows(() => memory.grow(1));
})();

(function TestGrowMemoryZeroInitialMemory() {
  print("ZeroInitialMemory");
  let memory = new WebAssembly.Memory({initial: 0});
  assertEquals(0, memory.buffer.byteLength);
  let i32 = new Int32Array(memory.buffer);
  let builder = new WasmModuleBuilder();
  builder.addImportedMemory("mine", "fro");
  builder.addFunction("load", kSig_i_i)
      .addBody([kExprGetLocal, 0, kExprI32LoadMem, 0, 0])
      .exportFunc();
  builder.addFunction("store", kSig_i_ii)
      .addBody([kExprGetLocal, 0, kExprGetLocal, 1, kExprI32StoreMem, 0, 0,
                kExprGetLocal, 1])
      .exportFunc();
  var offset;
  let instance = builder.instantiate({mine: {fro: memory}});
  function load() { return instance.exports.load(offset); }
  function store(value) { return instance.exports.store(offset, value); }

  for (var i = 1; i < 5; i++) {
    assertEquals(i - 1, memory.grow(1));
    assertEquals(i * kPageSize, memory.buffer.byteLength);
    for (offset = (i - 1) * kPageSize; offset < i * kPageSize - 3; offset++) {
      store(offset * 2);
    }
  }
  for (offset = 5 * kPageSize; offset < 5 * kPageSize + 4; offset++) {
    assertThrows(load);
  }
  assertThrows(() => memory.grow(16381));
})();

(function ImportedMemoryBufferLength() {
  print("ImportedMemoryBufferLength");
  let memory = new WebAssembly.Memory({initial: 2, maximum: 10});
  assertEquals(2*kPageSize, memory.buffer.byteLength);
  let builder = new WasmModuleBuilder();
  builder.addFunction("grow", kSig_i_i)
      .addBody([kExprGetLocal, 0, kExprGrowMemory, kMemoryZero])
      .exportFunc();
  builder.addImportedMemory("cat", "mine");
  let instance = builder.instantiate({cat: {mine: memory}});
  function grow(pages) { return instance.exports.grow(pages); }
  assertEquals(2, grow(3));
  assertEquals(5*kPageSize, memory.buffer.byteLength);
  assertEquals(5, grow(5));
  assertEquals(10*kPageSize, memory.buffer.byteLength);
  assertThrows(() => memory.grow(1));
})();

(function TestGrowMemoryExportedMaximum() {
  print("TestGrowMemoryExportedMaximum");
  let initial_size = 1, maximum_size = 10;
  var exp_instance;
  {
    let builder = new WasmModuleBuilder();
    builder.addMemory(initial_size, maximum_size, true);
    builder.exportMemoryAs("exported_mem");
    exp_instance = builder.instantiate();
  }
  var instance;
  {
    var builder = new WasmModuleBuilder();
    builder.addImportedMemory("fur", "imported_mem");
    builder.addFunction("mem_size", kSig_i_v)
      .addBody([kExprMemorySize, kMemoryZero])
      .exportFunc();
    builder.addFunction("grow", kSig_i_i)
      .addBody([kExprGetLocal, 0, kExprGrowMemory, kMemoryZero])
      .exportFunc();
    instance = builder.instantiate({fur: {
      imported_mem: exp_instance.exports.exported_mem}});
  }
  for (var i = initial_size; i < maximum_size; i++) {
    assertEquals(i, instance.exports.grow(1));
    assertEquals((i+1), instance.exports.mem_size());
  }
  assertEquals(-1, instance.exports.grow(1));
})();

(function TestMemoryGrowWebAssemblyInstances() {
  print("TestMemoryGrowWebAssemblyInstances");
  let memory = new WebAssembly.Memory({initial: 1, maximum: 15});
  var builder = new WasmModuleBuilder();
  builder.addImportedMemory("lit", "imported_mem");
  builder.addFunction("mem_size", kSig_i_v)
    .addBody([kExprMemorySize, kMemoryZero])
    .exportAs("mem_size");
  builder.addFunction("grow", kSig_i_i)
    .addBody([kExprGetLocal, 0, kExprGrowMemory, kMemoryZero])
    .exportFunc();
  var module = new WebAssembly.Module(builder.toBuffer());
  var instances = [];
  for (var i = 0; i < 6; i++) {
    instances.push(new WebAssembly.Instance(module, {lit: {imported_mem: memory}}));
  }
  function verify_mem_size(expected_pages) {
    assertEquals(expected_pages*kPageSize,
        memory.buffer.byteLength);
    for (var i = 0; i < 6; i++) {
      assertEquals(expected_pages, instances[i].exports.mem_size());
    }
  }

  // Verify initial memory size
  verify_mem_size(1);

  // Verify memory size with interleaving calls to Memory.grow,
  // GrowMemory opcode.
  var current_mem_size = 1;
  for (var i = 0; i < 5; i++) {
    function grow(pages) { return instances[i].exports.grow(pages); }
    assertEquals(current_mem_size, memory.grow(1));
    verify_mem_size(++current_mem_size);
    assertEquals(current_mem_size, instances[i].exports.grow(1));
    verify_mem_size(++current_mem_size);
  }

  assertThrows(() => memory.grow(5));
})();

(function TestImportedMemoryGrowMultipleInstances() {
  print("TestImportMemoryMultipleInstances");
  let memory = new WebAssembly.Memory({initial: 5, maximum: 100});
  var builder = new WasmModuleBuilder();
  builder.addImportedMemory("nob", "imported_mem");
  builder.addFunction("mem_size", kSig_i_v)
    .addBody([kExprMemorySize, kMemoryZero])
    .exportFunc();
  builder.addFunction("grow", kSig_i_i)
    .addBody([kExprGetLocal, 0, kExprGrowMemory, kMemoryZero])
    .exportFunc();
  var instances = [];
  for (var i = 0; i < 5; i++) {
    instances.push(builder.instantiate({nob: {imported_mem: memory}}));
  }
  function grow_instance_0(pages) { return instances[0].exports.grow(pages); }
  function grow_instance_1(pages) { return instances[1].exports.grow(pages); }
  function grow_instance_2(pages) { return instances[2].exports.grow(pages); }
  function grow_instance_3(pages) { return instances[3].exports.grow(pages); }
  function grow_instance_4(pages) { return instances[4].exports.grow(pages); }

  function verify_mem_size(expected_pages) {
    assertEquals(expected_pages*kPageSize, memory.buffer.byteLength);
    for (var i = 0; i < 5; i++) {
      assertEquals(expected_pages, instances[i].exports.mem_size());
    }
  }

  // Verify initial memory size
  verify_mem_size(5);

  // Grow instance memory and buffer memory out of order and verify memory is
  // updated correctly.
  assertEquals(5, grow_instance_0(7));
  verify_mem_size(12);

  assertEquals(12, memory.grow(4));
  verify_mem_size(16);

  assertEquals(16, grow_instance_4(1));
  verify_mem_size(17);

  assertEquals(17, grow_instance_1(6));
  verify_mem_size(23);

  assertEquals(23, grow_instance_3(2));
  verify_mem_size(25);

  assertEquals(25, memory.grow(10));
  verify_mem_size(35);

  assertEquals(35, grow_instance_2(15));
  verify_mem_size(50);
  assertThrows(() => memory.grow(51));
})();

(function TestExportImportedMemoryGrowMultipleInstances() {
  // TODO(gdeepti):Exported memory objects currently do not take max_size
  // into account so this can grow past the maximum specified in the exported
  // memory object. Assert that growing past maximum for exported objects fails.
  print("TestExportImportedMemoryGrowMultipleInstances");
  var instance;
  {
    let builder = new WasmModuleBuilder();
    builder.addMemory(1, 11, true);
    builder.exportMemoryAs("exported_mem");
    builder.addFunction("mem_size", kSig_i_v)
      .addBody([kExprMemorySize, kMemoryZero])
      .exportFunc();
    instance = builder.instantiate();
  }
  var builder = new WasmModuleBuilder();
  builder.addImportedMemory("doo", "imported_mem");
  builder.addFunction("mem_size", kSig_i_v)
    .addBody([kExprMemorySize, kMemoryZero])
    .exportFunc();
  builder.addFunction("grow", kSig_i_i)
    .addBody([kExprGetLocal, 0, kExprGrowMemory, kMemoryZero])
    .exportFunc();
  var instances = [];
  for (var i = 0; i < 10; i++) {
    instances.push(builder.instantiate({
      doo: {imported_mem: instance.exports.exported_mem}}));
  }
  function verify_mem_size(expected_pages) {
    for (var i = 0; i < 10; i++) {
      assertEquals(expected_pages, instances[i].exports.mem_size());
    }
  }
  var current_mem_size = 1;
  for (var i = 0; i < 10; i++) {
    function grow(pages) { return instances[i].exports.grow(pages); }
    assertEquals(current_mem_size, instances[i].exports.grow(1));
    verify_mem_size(++current_mem_size);
  }
})();

(function TestExportGrow() {
  print("TestExportGrow");
  let builder = new WasmModuleBuilder();
  builder.addMemory(1, 5, true);
  builder.exportMemoryAs("exported_mem");
  builder.addFunction("mem_size", kSig_i_v)
    .addBody([kExprMemorySize, kMemoryZero])
    .exportFunc();
  builder.addFunction("grow", kSig_i_i)
    .addBody([kExprGetLocal, 0, kExprGrowMemory, kMemoryZero])
    .exportFunc();
  instance = builder.instantiate();
  assertEquals(kPageSize, instance.exports.exported_mem.buffer.byteLength);
  assertEquals(1, instance.exports.grow(2));
  assertEquals(3, instance.exports.mem_size());
  assertEquals(3*kPageSize, instance.exports.exported_mem.buffer.byteLength);
})();
