import init, { worker_entry_point } from './pkg/wasm.js'

self.onmessage = async event => {
    const [module, memory, ptr, port] = event.data;

    await init(module, memory);
    worker_entry_point(Number(ptr), port)
}