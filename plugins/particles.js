;(function () {
  'use strict'

  const PLUGIN_NAME = 'particles'

  if (window.AnimationPlugins && window.AnimationPlugins.installed(PLUGIN_NAME)) return

  let canvas, ctx, particles, animId, config

  const STYLES = {

    /* ── 浮游节点 ── */
    nodes: {
      label: '浮游节点',
      defaults: { count: 60, color: '#e11d48', sizeMin: 2, sizeMax: 5, speed: 0.3, opacity: 0.15, connect: true, connectDist: 120 },
      create() {
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * config.speed * 2,
          vy: (Math.random() - 0.5) * config.speed * 2,
          r: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
          phase: Math.random() * Math.PI * 2
        }
      },
      update(p) {
        p.x += p.vx
        p.y += p.vy
        wrap(p)
      },
      draw(ctx, p, i) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = config.color
        ctx.globalAlpha = config.opacity * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(p.phase + i)))
        ctx.fill()
        ctx.globalAlpha = 1

        if (config.connect) {
          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j]
            const dx = p.x - q.x
            const dy = p.y - q.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < config.connectDist) {
              ctx.beginPath()
              ctx.moveTo(p.x, p.y)
              ctx.lineTo(q.x, q.y)
              ctx.strokeStyle = config.color
              ctx.globalAlpha = (1 - dist / config.connectDist) * config.opacity * 0.5
              ctx.lineWidth = 0.5
              ctx.stroke()
              ctx.globalAlpha = 1
            }
          }
        }
      }
    },

    /* ── 闪烁星辰 ── */
    stars: {
      label: '闪烁星辰',
      defaults: { count: 80, color: '#fbbf24', sizeMin: 1, sizeMax: 4, speed: 0.08, opacity: 0.6, connect: false, connectDist: 0 },
      create() {
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * config.speed,
          vy: (Math.random() - 0.5) * config.speed,
          r: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.5 + Math.random() * 2
        }
      },
      update(p) {
        p.x += p.vx
        p.y += p.vy
        p.phase += 0.02 * p.twinkleSpeed
        wrap(p)
      },
      draw(ctx, p) {
        const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.phase))
        const r = p.r * (0.5 + 0.5 * brightness)
        const alpha = config.opacity * brightness

        ctx.globalAlpha = alpha
        ctx.fillStyle = config.color
        ctx.shadowColor = config.color
        ctx.shadowBlur = r * 3

        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }
    },

    /* ── 上升气泡 ── */
    bubbles: {
      label: '上升气泡',
      defaults: { count: 30, color: '#93c5fd', sizeMin: 6, sizeMax: 18, speed: 0.5, opacity: 0.25, connect: false, connectDist: 0 },
      create() {
        return {
          x: Math.random() * canvas.width,
          y: canvas.height + 20 + Math.random() * 100,
          vx: (Math.random() - 0.5) * 0.2,
          vy: -(0.3 + Math.random() * config.speed),
          r: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
          phase: Math.random() * Math.PI * 2,
          wobble: 0.2 + Math.random() * 0.4
        }
      },
      update(p) {
        p.x += p.vx + Math.sin(p.phase) * p.wobble * 0.3
        p.y += p.vy
        p.phase += 0.02

        if (p.y < -p.r - 20) {
          p.y = canvas.height + 20 + Math.random() * 100
          p.x = Math.random() * canvas.width
        }
      },
      draw(ctx, p) {
        const alpha = Math.min(1, Math.max(0.1, (p.y / canvas.height) * 1.2)) * config.opacity
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.strokeStyle = config.color
        ctx.lineWidth = Math.max(1, p.r * 0.12)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.25, 0, Math.PI * 2)
        ctx.fillStyle = config.color
        ctx.globalAlpha = alpha * 0.3
        ctx.fill()

        ctx.globalAlpha = 1
      }
    },

    /* ── 萤火虫 ── */
    fireflies: {
      label: '萤火虫',
      defaults: { count: 35, color: '#a7f3d0', sizeMin: 2, sizeMax: 5, speed: 0.15, opacity: 0.7, connect: false, connectDist: 0 },
      create() {
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * config.speed,
          vy: (Math.random() - 0.5) * config.speed,
          r: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
          phase: Math.random() * Math.PI * 2,
          glowPhase: Math.random() * Math.PI * 2,
          life: 0.3 + Math.random() * 0.7,
          targetVx: 0,
          targetVy: 0,
          changeTimer: Math.random() * 200
        }
      },
      update(p) {
        p.changeTimer--
        if (p.changeTimer <= 0) {
          p.targetVx = (Math.random() - 0.5) * config.speed * 2
          p.targetVy = (Math.random() - 0.5) * config.speed * 2
          p.changeTimer = 60 + Math.random() * 200
        }
        p.vx += (p.targetVx - p.vx) * 0.02
        p.vy += (p.targetVy - p.vy) * 0.02
        p.x += p.vx
        p.y += p.vy
        p.glowPhase += 0.03
        wrap(p)
      },
      draw(ctx, p) {
        const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.glowPhase))
        const r = p.r * (0.6 + 0.4 * glow)
        const alpha = config.opacity * glow * p.life

        ctx.globalAlpha = alpha * 0.3
        ctx.fillStyle = config.color
        ctx.shadowColor = config.color
        ctx.shadowBlur = r * 8
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = r * 4
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }
    },

    /* ── 飘雪 ── */
    snow: {
      label: '飘雪',
      defaults: { count: 120, color: '#ffffff', sizeMin: 1, sizeMax: 4, speed: 0.4, opacity: 0.5, connect: false, connectDist: 0 },
      create() {
        return {
          x: Math.random() * canvas.width * 1.4 - canvas.width * 0.2,
          y: -(Math.random() * canvas.height),
          vx: (Math.random() - 0.5) * 0.15,
          vy: 0.3 + Math.random() * config.speed,
          r: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
          phase: Math.random() * Math.PI * 2,
          drift: 0.2 + Math.random() * 0.5
        }
      },
      update(p) {
        p.x += p.vx + Math.sin(p.phase) * p.drift * 0.2
        p.y += p.vy
        p.phase += 0.015 + p.r * 0.005
        if (p.y > canvas.height + p.r) {
          p.y = -p.r
          p.x = Math.random() * canvas.width * 1.4 - canvas.width * 0.2
        }
        if (p.x < -canvas.width * 0.2) p.x = canvas.width * 1.2
        if (p.x > canvas.width * 1.2) p.x = -canvas.width * 0.2
      },
      draw(ctx, p) {
        ctx.globalAlpha = config.opacity * (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(p.phase * 2)))
        ctx.fillStyle = config.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    },

    /* ── 极光粒子流 ── */
    aurora: {
      label: '极光粒子流',
      defaults: { count: 100, color: '#818cf8', sizeMin: 2, sizeMax: 6, speed: 0.2, opacity: 0.2, connect: false, connectDist: 0 },
      create() {
        return {
          x: Math.random() * canvas.width * 1.3 - canvas.width * 0.15,
          y: Math.random() * canvas.height * 0.5,
          vx: (0.2 + Math.random() * config.speed * 0.5),
          vy: (Math.random() - 0.5) * 0.15,
          r: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
          phase: Math.random() * Math.PI * 2,
          yBase: Math.random() * canvas.height * 0.5,
          yAmp: 20 + Math.random() * 60,
          yFreq: 0.005 + Math.random() * 0.015,
          hue: Math.random() * 60 - 30
        }
      },
      update(p) {
        p.x += p.vx
        p.y = p.yBase + Math.sin(p.x * p.yFreq + p.phase) * p.yAmp
        p.vy = (Math.random() - 0.5) * 0.1
        p.y += p.vy
        p.phase += 0.003

        if (p.x > canvas.width + 20) {
          p.x = -20
          p.yBase = Math.random() * canvas.height * 0.5
          p.yAmp = 20 + Math.random() * 60
        }
      },
      draw(ctx, p) {
        const parentColor = config.color
        const hue = parseInt(parentColor.slice(1, 3), 16)
        const sat = parseInt(parentColor.slice(3, 5), 16)
        const light = parseInt(parentColor.slice(5, 7), 16)

        const nh = Math.max(0, Math.min(255, hue + p.hue))
        const color = `rgb(${nh},${Math.max(100, sat + 30)},${Math.max(150, light + 50)})`

        const alpha = config.opacity * (0.4 + 0.6 * (1 - Math.abs(p.y - p.yBase) / p.yAmp))
        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = p.r * 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }
    }
  }

  function wrap(p) {
    const margin = p.r * 2
    if (p.x < -margin) p.x = canvas.width + margin
    if (p.x > canvas.width + margin) p.x = -margin
    if (p.y < -margin) p.y = canvas.height + margin
    if (p.y > canvas.height + margin) p.y = -margin
  }

  function init(cfg) {
    config = Object.assign({}, STYLES.nodes.defaults, cfg || {})
    const styleDef = STYLES[config.style] || STYLES.nodes
    config = Object.assign({}, styleDef.defaults, cfg || {})

    if (canvas) destroy()

    canvas = document.createElement('canvas')
    canvas.id = 'plugin-particles-canvas'
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1'
    document.body.appendChild(canvas)
    ctx = canvas.getContext('2d')

    resize()
    window.addEventListener('resize', resize)

    const style = STYLES[config.style] || STYLES.nodes
    particles = Array.from({ length: config.count }, () => style.create())
    animate()
  }

  function resize() {
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  function animate() {
    animId = requestAnimationFrame(animate)
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const style = STYLES[config.style] || STYLES.nodes
    particles.forEach((p, i) => {
      style.update(p)
      style.draw(ctx, p, i)
    })
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId)
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
    canvas = null
    ctx = null
    particles = null
    animId = null
  }

  const api = { init, destroy, name: PLUGIN_NAME, label: '背景粒子', config: {} }

  if (!window.AnimationPlugins) window.AnimationPlugins = { _registry: {}, installed: function (n) { return !!this._registry[n] }, register: function (p) { this._registry[p.name] = p }, get: function (n) { return this._registry[n] }, getAll: function () { return Object.values(this._registry) } }
  window.AnimationPlugins.register(api)
})()
