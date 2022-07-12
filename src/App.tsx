import { createRef, RefObject, useEffect, useRef, useState } from 'react'
import favicon_png from './favicon.png'
import tileset_png from './super-mario-bros-mega-tileset.png'
import { assert, entries, floor, random } from './utils'

const px = 16

const map_legend: { [key: string]: [number, number] } = {
  // ground
  gq: [0, 58],
  gw: [1, 58],
  ge: [2, 58],
  ga: [0, 59],
  gs: [1, 59],
  gd: [2, 59],
  gz: [0, 60],
  gx: [1, 60],
  gc: [2, 60],
  g1: [4, 58],
  g2: [5, 58],
  g3: [4, 59],
  g4: [5, 59],
  // tree
  tq: [30, 37],
  tw: [31, 37],
  te: [32, 37],
  ta: [30, 38],
  ts: [31, 38],
  td: [32, 38],
  tz: [30, 39],
  tx: [31, 39],
  tc: [32, 39],
  t1: [31, 40],
  t2: [31, 41],
  // spinning block
  b1: [0, 5],
  b2: [1, 5],
  b3: [2, 5],
  b4: [3, 5],
}

const map_json = [
  '  ,  ,  ,  ,  ,  ,  ,  ,  ,  ',
  '  ,  ,  ,  ,  ,  ,  ,  ,  ,  ',
  '  ,  ,  ,  ,  ,  ,  ,  ,  ,  ',
  '  ,  ,  ,tq,tw,te,  ,  ,  ,  ',
  '  ,b1,  ,ta,ts,td,  ,  ,  ,  ',
  '  ,  ,  ,tz,tx,tc,g1,gw,g2,  ',
  '  ,  ,  ,  ,t1,  ,g3,gs,g4,  ',
  '  ,  ,  ,  ,t2,  ,g3,gs,g4,  ',
  'gq,gw,gw,gw,gw,gw,gw,gw,gw,ge',
  'ga,gs,gs,gs,gs,gs,gs,gs,gs,gd',
]

type BoxKind = 'solid' | 'sensor' | 'platform'
type Box = {
  id: string
  x: number
  // always starts bottom-up, "standing"
  y: number
  w: number
  h: number
  kind: BoxKind
}

class Physics {
  private constructor(
    public stepMs = 1000 / 60,
    public startTime = Date.now(),
    public lastTime = Date.now(),
    public boxes: { [id: string]: Box } = {},
  ) {}

  // async to support dynamically imported physics engines
  static async create() {
    return new Physics()
  }

  add({ id = `${random()}`, x = 0, y = 0, w = 1, h = 1, kind = 'solid' }: Partial<Box>) {
    assert(!(id in this.boxes), `Box@${id} already exists`)

    const box: Box = { id, x, y, w, h, kind }
    this.boxes[id] = box
    return box
  }

  step(onCollision?: (box1: Box, box2: Box) => void) {}
}

function SplashLayer() {
  const [showSplash, setShowSplash] = useState(true)
  return (
    <div className={`${!showSplash && 'opacity-0'} transition-opacity`} onClick={() => setShowSplash(false)}>
      <div className="absolute flex items-center justify-center w-full h-full bg-yellow-200 cursor-pointer select-none">
        <div className="relative flex animate-bounce">
          <div className="font-[SunnySpells] text-7xl text-black">Supermaple</div>
          <img className="absolute h-1/3 left-full" src={favicon_png} alt="icon" />
        </div>
      </div>
    </div>
  )
}

function GameLayer() {
  const cameraTiles = 10
  const cameraSidePx = cameraTiles * px

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxDivsRef = useRef<{ [id: string]: RefObject<HTMLDivElement> }>({})

  // init physics dynamically
  const [physics, setPhysics] = useState<Physics>()
  useEffect(() => {
    Physics.create().then(setPhysics)
  }, [])

  // populate physics
  useEffect(() => {
    if (!physics) return

    const boxes = [physics.add({})]

    for (const { id } of boxes) {
      boxDivsRef.current[id] = createRef()
    }
  }, [physics])

  // realtime game loop (physical + visual)
  useEffect(() => {
    if (!physics) return

    const { stepMs } = physics

    const raf: [number] = [0]

    const onAnimationFrame = (time: number) => {
      raf[0] = requestAnimationFrame(onAnimationFrame)

      physics.startTime = physics.startTime ?? time
      physics.lastTime = physics.lastTime ?? time

      const { startTime, lastTime } = physics

      const pastFrames = floor((lastTime - startTime) / stepMs)
      const allFrames = floor((time - startTime) / stepMs)
      const fastForwardFrames = allFrames - pastFrames

      if (fastForwardFrames) physics.lastTime = time

      for (let f = 0; f < fastForwardFrames; f++) {
        const frame = pastFrames + f

        physics.step((box1, box2) => {
          // playSound('land')
        })

        const { boxes } = physics

        // animate box divs
        for (const id in boxes) {
          const box = boxes[id]!
          const { current: div } = boxDivsRef.current[box.id]!

          if (!div) continue

          div.style.width = `${box.w * px}px`
          div.style.height = `${box.h * px}px`
          div.style.transform = `translate(${box.x * px}px,${box.y * px}px)`
        }
      }
    }
    raf[0] = requestAnimationFrame(onAnimationFrame)

    return () => {
      cancelAnimationFrame(raf[0])
    }
  }, [physics])

  // load tileset
  const [tileset, setTileset] = useState<HTMLImageElement>()
  useEffect(() => {
    const img = new Image()
    img.onload = () => setTileset(img)
    img.src = tileset_png
  }, [])

  // keep track on window size
  const [[windowW, windowH], setWindowSize] = useState([window.innerWidth, window.innerHeight])
  useEffect(() => {
    function onResize() {
      setWindowSize([window.innerWidth, window.innerHeight])
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const cameraRatio = cameraSidePx / cameraSidePx
  const windowRatio = windowW / windowH
  const scaleCameraByH = windowRatio > cameraRatio
  const cameraScale = scaleCameraByH ? windowH / cameraSidePx : windowW / cameraSidePx

  // draw tiles
  useEffect(() => {
    if (!tileset) return

    const canvas = canvasRef.current!
    const canvasContext = canvas.getContext('2d')!

    for (const ystr in map_json) {
      const y = Number(ystr)
      const rowTiles = map_json[ystr]!.split(',')

      for (let x = 0; x < rowTiles.length; x++) {
        const tileKey = rowTiles[x]!
        if (!(tileKey in map_legend)) continue
        const [sx, sy] = map_legend[tileKey]!

        const tilesetPxOff = px + 1

        canvasContext.drawImage(
          tileset,
          1 + sx * tilesetPxOff,
          1 + sy * tilesetPxOff,
          1 * px,
          1 * px,
          x * px,
          y * px,
          1 * px,
          1 * px,
        )
      }
    }
  }, [tileset])

  const boxDivs =
    physics &&
    entries(boxDivsRef.current).map(([id, ref]) => {
      const box = physics.boxes[id]

      if (!box) return null
      const { w, h, kind } = box

      // if (kind === 'warp') {
      //   return (
      //     <div key={id} ref={ref} className="absolute top-0 left-0 flex items-end justify-center">
      //       <div
      //         className="bg-black rounded-t-full animate-pulse"
      //         style={{
      //           width: `${1 * px}px`,
      //           height: `${2 * px}px`,
      //         }}
      //       />
      //     </div>
      //   )
      // }

      // if (kind === 'block') {
      //   return (
      //     <div key={id} ref={ref} className="absolute top-0 left-0 flex items-center justify-center">
      //       <img className="max-w-none" src={boxSprite} alt="block sprite" />
      //     </div>
      //   )
      // }

      return (
        <div key={id} ref={ref} className="absolute top-0 left-0 flex items-center justify-center">
          <div
            className="outline"
            style={{
              width: `${w * px}px`,
              height: `${h * px}px`,
            }}
          />
          {/* <img className="max-w-none" src={boxSprite} alt="block sprite" /> */}
        </div>
      )

      return null
    })

  return (
    <div className="absolute flex items-center justify-center w-full h-full select-none bg-gradient-to-b from-blue-400 to-blue-100">
      <div
        style={{
          transform: `scale(${cameraScale})`,
        }}
      >
        <canvas ref={canvasRef} width={cameraSidePx} height={cameraSidePx} />
        {boxDivs}
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="absolute w-full h-full bg-yellow-200">
      <GameLayer />
      {/* <SplashLayer /> */}
    </div>
  )
}

export default App
