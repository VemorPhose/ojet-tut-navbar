define([], function() {
  'use strict';

  let threeModulePromise;

  function loadThree() {
    if (!threeModulePromise) {
      threeModulePromise = import('../libs/three/three.module.js');
    }
    return threeModulePromise;
  }

  function finiteNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function transformValue(value, axis) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (axis && axis.transform === 'log') {
      return Math.log10(Math.max(value, 1));
    }
    return value;
  }

  function quantile(values, percentile) {
    const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!sorted.length) {
      return 0;
    }
    const index = (sorted.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
      return sorted[lower];
    }
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  function extent(rows, axis) {
    const values = rows.map((row) => transformValue(row[axis.key], axis)).filter((value) => Number.isFinite(value));
    if (!values.length) {
      return { min: 0, max: 1 };
    }
    let min = quantile(values, 0.04);
    let max = quantile(values, 0.96);
    if (min === max) {
      min = Math.min.apply(null, values);
      max = Math.max.apply(null, values);
    }
    if (min === max) {
      max = min + 1;
    }
    return { min: min, max: max };
  }

  function mapValue(value, bounds, size, axis) {
    const mapped = transformValue(value, axis);
    if (!Number.isFinite(mapped) || bounds.max === bounds.min) {
      return 0;
    }
    const clamped = Math.max(bounds.min, Math.min(bounds.max, mapped));
    return ((clamped - bounds.min) / (bounds.max - bounds.min) - 0.5) * size;
  }

  function jitter(row, salt) {
    const raw = String(row.id || '') + salt;
    let hash = 0;
    for (let index = 0; index < raw.length; index += 1) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(index);
      hash |= 0;
    }
    return ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.22;
  }

  function createTextSprite(THREE, label, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 256 * pixelRatio;
    canvas.height = 64 * pixelRatio;
    context.scale(pixelRatio, pixelRatio);
    context.font = '600 22px Arial, sans-serif';
    context.fillStyle = 'rgba(5, 5, 5, 0.88)';
    context.fillRect(0, 0, 256, 64);
    context.strokeStyle = color || '#fafafa';
    context.lineWidth = 2;
    context.strokeRect(1, 1, 254, 62);
    context.fillStyle = color || '#fafafa';
    context.fillText(label, 18, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5.9, 1.48, 1);
    return sprite;
  }

  function addAxis(THREE, root, start, end, label, labelPosition, color) {
    const material = new THREE.LineBasicMaterial({ color: color || 0xf4f4f5, transparent: true, opacity: 0.82 });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start[0], start[1], start[2]),
      new THREE.Vector3(end[0], end[1], end[2])
    ]);
    const line = new THREE.Line(geometry, material);
    root.add(line);

    const sprite = createTextSprite(THREE, label, '#fafafa');
    sprite.position.set(labelPosition[0], labelPosition[1], labelPosition[2]);
    root.add(sprite);
  }

  function addGrid(THREE, root, size) {
    const material = new THREE.LineBasicMaterial({ color: 0x71717a, transparent: true, opacity: 0.28 });
    const geometry = new THREE.BufferGeometry();
    const points = [];
    const half = size / 2;
    const step = size / 6;

    for (let i = 0; i <= 6; i += 1) {
      const offset = -half + step * i;
      points.push(new THREE.Vector3(-half, -half, offset), new THREE.Vector3(half, -half, offset));
      points.push(new THREE.Vector3(offset, -half, -half), new THREE.Vector3(offset, -half, half));
    }

    geometry.setFromPoints(points);
    root.add(new THREE.LineSegments(geometry, material));
  }

  function createTooltip(container) {
    const tooltip = document.createElement('div');
    tooltip.className = 'scene-tooltip';
    tooltip.hidden = true;
    container.appendChild(tooltip);
    return tooltip;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setTooltip(tooltip, event, canvas, row, config, formatAxisValue) {
    const bounds = canvas.getBoundingClientRect();
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    const xLine = document.createElement('span');
    const yLine = document.createElement('span');
    const zLine = document.createElement('span');
    const groupLine = document.createElement('span');
    const axis = config.axes;

    title.textContent = row.company + ' ' + row.typeName;
    meta.textContent = row.cpu + ' / ' + row.ram + ' / ' + row.weight;
    xLine.textContent = axis.x.label + ': ' + formatAxisValue(row[axis.x.key], axis.x);
    yLine.textContent = axis.y.label + ': ' + formatAxisValue(row[axis.y.key], axis.y);
    zLine.textContent = axis.z.label + ': ' + formatAxisValue(row[axis.z.key], axis.z);
    groupLine.textContent = config.groupLabel + ': ' + (row[config.colorKey] || 'Other');

    tooltip.replaceChildren(title, meta, xLine, yLine, zLine, groupLine);
    tooltip.hidden = false;

    const tooltipBounds = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipBounds.width || 224;
    const tooltipHeight = tooltipBounds.height || 120;
    const cursorX = event.clientX - bounds.left;
    const cursorY = event.clientY - bounds.top;
    let left = cursorX + 16;
    let top = cursorY - 18;

    if (left + tooltipWidth + 12 > bounds.width) {
      left = cursorX - tooltipWidth - 16;
    }

    tooltip.style.left = clamp(left, 12, Math.max(12, bounds.width - tooltipWidth - 12)) + 'px';
    tooltip.style.top = clamp(top, 12, Math.max(12, bounds.height - tooltipHeight - 12)) + 'px';
  }

  function createLaptopScene(container, options) {
    return loadThree().then(function(THREE) {
      const config = options.config;
      const formatAxisValue = options.formatAxisValue;
      const rows = (options.rows || []).filter((row) => (
        Number.isFinite(row[config.axes.x.key]) &&
        Number.isFinite(row[config.axes.y.key]) &&
        Number.isFinite(row[config.axes.z.key])
      ));
      const size = 21;
      const extents = {
        x: extent(rows, config.axes.x),
        y: extent(rows, config.axes.y),
        z: extent(rows, config.axes.z)
      };

      let width = Math.max(container.clientWidth, 320);
      let height = Math.max(container.clientHeight, 360);
      let frameId = 0;
      let dragging = false;
      let lastPointer = { x: 0, y: 0 };
      let destroyed = false;
      let hoveredIndex = -1;

      container.textContent = '';
      container.classList.add('scene-ready');

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x000000, 46, 92);

      const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000);
      camera.position.set(0, 11, 38);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x050505, 1);
      container.appendChild(renderer.domElement);

      const tooltip = createTooltip(container);
      const root = new THREE.Group();
      root.rotation.x = -0.34;
      root.rotation.y = 0.62;
      scene.add(root);

      const ambient = new THREE.AmbientLight(0xf4f4f5, 0.88);
      const key = new THREE.DirectionalLight(0xffffff, 1.3);
      const rim = new THREE.PointLight(0xd4d4d8, 1.2, 90);
      key.position.set(10, 18, 14);
      rim.position.set(-14, 10, 18);
      scene.add(ambient, key, rim);

      addGrid(THREE, root, size);
      addAxis(THREE, root, [-size / 2, -size / 2, -size / 2], [size / 2, -size / 2, -size / 2], config.axes.x.label, [size / 2 + 3.1, -size / 2, -size / 2], 0xfafafa);
      addAxis(THREE, root, [-size / 2, -size / 2, -size / 2], [-size / 2, size / 2, -size / 2], config.axes.y.label, [-size / 2 - 3.1, size / 2 + 0.4, -size / 2], 0xd4d4d8);
      addAxis(THREE, root, [-size / 2, -size / 2, -size / 2], [-size / 2, -size / 2, size / 2], config.axes.z.label, [-size / 2, -size / 2, size / 2 + 3.1], 0xa1a1aa);

      const positions = [];
      const colors = [];
      const pointRows = [];
      const color = new THREE.Color();

      rows.forEach((row) => {
        const x = mapValue(finiteNumber(row[config.axes.x.key]), extents.x, size, config.axes.x) + jitter(row, 'x');
        const y = mapValue(finiteNumber(row[config.axes.y.key]), extents.y, size, config.axes.y) + jitter(row, 'y');
        const z = mapValue(finiteNumber(row[config.axes.z.key]), extents.z, size, config.axes.z) + jitter(row, 'z');
        positions.push(x, y, z);
        color.set(options.colorFor(row[config.colorKey]));
        colors.push(color.r, color.g, color.b);
        pointRows.push(row);
      });

      const pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      pointGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const pointMaterial = new THREE.PointsMaterial({
        size: rows.length > 850 ? 4.2 : 5.4,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: false
      });
      const points = new THREE.Points(pointGeometry, pointMaterial);
      root.add(points);

      const markerGeometry = new THREE.SphereGeometry(0.34, 24, 24);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
      markerMaterial.depthTest = false;
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.visible = false;
      root.add(marker);

      const projectedPoint = new THREE.Vector3();
      const worldPoint = new THREE.Vector3();
      const localPoint = new THREE.Vector3();
      const pickRadius = rows.length > 850 ? 6 : 8;

      function resize() {
        if (destroyed) {
          return;
        }
        width = Math.max(container.clientWidth, 320);
        height = Math.max(container.clientHeight, 360);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      function pickPoint(event) {
        const bounds = renderer.domElement.getBoundingClientRect();
        const cursorX = event.clientX - bounds.left;
        const cursorY = event.clientY - bounds.top;
        let best = null;
        let bestDistance = pickRadius;

        root.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);

        for (let index = 0; index < pointRows.length; index += 1) {
          const offset = index * 3;
          localPoint.set(positions[offset], positions[offset + 1], positions[offset + 2]);
          worldPoint.copy(localPoint).applyMatrix4(points.matrixWorld);
          projectedPoint.copy(worldPoint).project(camera);

          if (projectedPoint.z < -1 || projectedPoint.z > 1) {
            continue;
          }

          const screenX = (projectedPoint.x * 0.5 + 0.5) * bounds.width;
          const screenY = (-projectedPoint.y * 0.5 + 0.5) * bounds.height;
          const distance = Math.hypot(screenX - cursorX, screenY - cursorY);

          if (distance <= bestDistance) {
            bestDistance = distance;
            best = {
              index: index,
              position: localPoint.clone()
            };
          }
        }

        return best;
      }

      function handlePointerDown(event) {
        dragging = true;
        lastPointer = { x: event.clientX, y: event.clientY };
        renderer.domElement.setPointerCapture(event.pointerId);
      }

      function handlePointerMove(event) {
        if (dragging) {
          const dx = event.clientX - lastPointer.x;
          const dy = event.clientY - lastPointer.y;
          root.rotation.y += dx * 0.009;
          root.rotation.x += dy * 0.007;
          root.rotation.x = Math.max(-1.22, Math.min(0.84, root.rotation.x));
          lastPointer = { x: event.clientX, y: event.clientY };
        }

        const picked = pickPoint(event);
        if (picked) {
          hoveredIndex = picked.index;
          marker.position.copy(picked.position);
          marker.visible = true;
          setTooltip(tooltip, event, renderer.domElement, pointRows[hoveredIndex], config, formatAxisValue);
        } else {
          hoveredIndex = -1;
          marker.visible = false;
          tooltip.hidden = true;
        }
      }

      function handlePointerUp(event) {
        dragging = false;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId);
        }
      }

      function handlePointerLeave() {
        dragging = false;
        marker.visible = false;
        tooltip.hidden = true;
      }

      function handleWheel(event) {
        event.preventDefault();
        camera.position.z += event.deltaY * 0.018;
        camera.position.z = Math.max(21, Math.min(62, camera.position.z));
      }

      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointermove', handlePointerMove);
      renderer.domElement.addEventListener('pointerup', handlePointerUp);
      renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

      function animate(time) {
        if (destroyed) {
          return;
        }
        if (!dragging && hoveredIndex < 0) {
          root.rotation.y += 0.0016;
        }
        pointMaterial.size = (rows.length > 850 ? 4.2 : 5.4) + Math.sin(time * 0.002) * 0.2;
        marker.scale.setScalar(1 + Math.sin(time * 0.006) * 0.16);
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      }

      resize();
      frameId = requestAnimationFrame(animate);

      return {
        resize: resize,
        destroy: function() {
          destroyed = true;
          cancelAnimationFrame(frameId);
          resizeObserver.disconnect();
          renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
          renderer.domElement.removeEventListener('pointermove', handlePointerMove);
          renderer.domElement.removeEventListener('pointerup', handlePointerUp);
          renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
          renderer.domElement.removeEventListener('wheel', handleWheel);
          pointGeometry.dispose();
          pointMaterial.dispose();
          markerGeometry.dispose();
          markerMaterial.dispose();
          renderer.dispose();
          container.textContent = '';
          container.classList.remove('scene-ready');
        }
      };
    });
  }

  return {
    createLaptopScene: createLaptopScene
  };
});
