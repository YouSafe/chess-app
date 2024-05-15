import init, { Engine } from './pkg'

let engine = undefined

self.onmessage = async function (event) {
  if (!engine) {
    await init()
    engine = Engine.new()
  }
  engine?.receive_command(event.data)
}


