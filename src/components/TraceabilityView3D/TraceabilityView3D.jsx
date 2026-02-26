/**
 * TraceabilityView3D — 3D visualization of project traceability.
 *
 * Reads actual project nodes/edges and maps them into five layers:
 * - Requirements (top): requirement, platform
 * - Systems: system
 * - Subsystems: subSystem
 * - Functions: function, useCase, parameter
 * - Hardware (bottom): hardware, actor, testCase
 *
 * Filtered out: textAnnotation, postIt, image, drawing nodes
 *
 * Props:
 *   nodes - ReactFlow nodes from the project
 *   edges - ReactFlow edges from the project
 *   requirementLinks - requirement link objects (satisfies/derives/etc.)
 *   projectId - current project ID
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';

// ─── LAYER CONFIG ───────────────────────────────────────────
const LAYER_CONFIG = {
  requirements: {
    label: "Krav",
    y: 8,
    color: "#e74c3c",
    icon: "📋",
    types: ['requirement', 'platform', 'customer', 'project', 'implementation'],
  },
  systems: {
    label: "System",
    y: 4,
    color: "#1abc9c",
    icon: "⚙",
    types: ['system'],
  },
  subsystems: {
    label: "Subsystem",
    y: 0,
    color: "#3498db",
    icon: "🔧",
    types: ['subsystem'],
  },
  functions: {
    label: "Funktion",
    y: -4,
    color: "#2ecc71",
    icon: "⚡",
    types: ['function', 'usecase', 'parameter'],
  },
  hardware: {
    label: "Hårdvara",
    y: -8,
    color: "#f39c12",
    icon: "🖥",
    types: ['hardware', 'actor', 'testcase', 'testrun', 'testresult'],
  },
};

const TYPE_COLORS = {
  requirement: '#e74c3c',
  customer: '#9b59b6',
  platform: '#2c3e50',
  project: '#e67e22',
  implementation: '#f1c40f',
  system: '#1abc9c',
  subsystem: '#3498db',
  function: '#2ecc71',
  parameter: '#00bcd4',
  usecase: '#f39c12',
  hardware: '#795548',
  actor: '#2ecc71',
  testcase: '#27ae60',
  testrun: '#e67e22',
  testresult: '#9b59b6',
};

const STATUS_COLORS = {
  approved: '#22c55e',
  active: '#22c55e',
  'in-review': '#f59e0b',
  'in-progress': '#f59e0b',
  draft: '#94a3b8',
  rejected: '#ef4444',
  deprecated: '#ef4444',
};

const LINK_TYPE_COLORS = {
  satisfies: '#a78bfa',
  derives: '#60a5fa',
  refines: '#34d399',
  allocated: '#fdcb6e',
  validates: '#f472b6',
  conflicts: '#ef4444',
  default: '#6b7280',
};

// ─── HELPERS ────────────────────────────────────────────────
function createRoundedBox(w, h, d, r, s) {
  const shape = new THREE.Shape();
  const hw = w / 2 - r, hh = h / 2 - r;
  shape.moveTo(-hw - r, -hh);
  shape.lineTo(hw + r, -hh);
  shape.absarc(hw, -hh, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw + r, hh);
  shape.absarc(hw, hh, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw - r, hh + r);
  shape.absarc(-hw, hh, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw - r, -hh);
  shape.absarc(-hw, -hh, r, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: d, bevelEnabled: true, bevelThickness: r * 0.4, bevelSize: r * 0.4, bevelSegments: s,
  });
  g.center();
  return g;
}

function flowLineMat(color, lightMode = false) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: lightMode ? 0.8 : 0.5 } },
    vertexShader: `
      varying float vP; attribute float aP;
      void main() { vP = aP; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform float uTime, uOpacity; uniform vec3 uColor; varying float vP;
      void main() {
        float pulse = sin((vP - uTime * 0.4) * 10.0) * 0.5 + 0.5;
        gl_FragColor = vec4(uColor + pulse * 0.15, pulse * uOpacity + uOpacity * 0.15);
      }
    `,
    transparent: true, depthWrite: false,
    blending: lightMode ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
}

function getLayerForType(itemType, reqId) {
  // First try reqId prefix — more reliable when itemType is generic
  if (reqId) {
    const prefix = reqId.split('-')[0]?.toUpperCase();
    if (prefix === 'REQ') return 'requirements';
    if (prefix === 'SYS') return 'systems';
    if (prefix === 'SUB' || prefix === 'SUBSYS') return 'subsystems';
    if (prefix === 'FUN') return 'functions';
    if (prefix === 'HW' || prefix === 'HWR') return 'hardware';
    if (prefix === 'TC' || prefix === 'TEST') return 'hardware';
    if (prefix === 'UC') return 'functions';
    if (prefix === 'ACT') return 'hardware';
    if (prefix === 'PAR' || prefix === 'PRM') return 'functions';
    if (prefix === 'PLT' || prefix === 'PLAT') return 'requirements';
    // PRJ prefix: use itemType as fallback since PRJ can be anything
  }
  // Fallback to itemType
  for (const [layerKey, config] of Object.entries(LAYER_CONFIG)) {
    if (config.types.includes(itemType)) return layerKey;
  }
  return 'systems';
}

// ─── COMPONENT ──────────────────────────────────────────────
export default function TraceabilityView3D({
  projectId = null, nodes = [], edges = [], requirementLinks = [],
  className = '', style = {}, isDarkMode = true
}) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const animRef = useRef(null);
  const meshMapRef = useRef({});
  const linkMeshesRef = useRef([]);
  const layerGroupsRef = useRef({});
  const hoveredRef = useRef(null);
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const camAngle = useRef({ theta: 0.3, phi: 0.8, radius: 28 });
  const targetCam = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse2d = useRef(new THREE.Vector2());
  const allMeshes = useRef([]);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const labelDataRef = useRef([]);

  const [visibleLayers, setVisibleLayers] = useState({ requirements: true, systems: true, subsystems: true, functions: true, hardware: true });
  const [showLinkTypes, setShowLinkTypes] = useState(() => {
    const initial = {};
    Object.keys(LINK_TYPE_COLORS).forEach(k => initial[k] = true);
    return initial;
  });
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [labelPositions, setLabelPositions] = useState([]);
  const [isolatedIds, setIsolatedIds] = useState(null); // Set of node IDs in isolated tree, or null
  const isolatedIdsRef = useRef(null);
  useEffect(() => { isolatedIdsRef.current = isolatedIds; }, [isolatedIds]);

  // ─── PROCESS PROJECT DATA ──────────────────────────────
  const { layerData, linkData, stats, linkTypesInUse } = useMemo(() => {
    // Filter out annotations/postits, deduplicate by ID
    const seenIds = new Set();
    const validNodes = nodes.filter(n => {
      if (!n.data?.itemType) return false;
      if (['textAnnotation', 'postIt', 'postit', 'image', 'whiteboard_image', 'img', 'drawing'].includes(n.data.itemType)) return false;
      // Also filter nodes that are just numbers (image refs from whiteboard)
      if (n.data.itemType === 'image' || (n.data.label && /^\d+$/.test(n.data.label) && !n.data.reqId)) return false;
      if (seenIds.has(n.id)) return false;
      seenIds.add(n.id);
      return true;
    });

    const layerItems = { requirements: [], systems: [], subsystems: [], functions: [], hardware: [] };

    validNodes.forEach(n => {
      const d = n.data;
      const layerKey = getLayerForType(d.itemType, d.reqId);
      layerItems[layerKey].push({
        id: n.id,
        label: d.label || d.reqId || n.id,
        reqId: d.reqId || '',
        desc: d.description || '',
        itemType: d.itemType,
        status: d.status || 'draft',
        priority: d.priority || 'medium',
        color: TYPE_COLORS[d.reqType] || TYPE_COLORS[d.itemType] || LAYER_CONFIG[layerKey].color,
      });
    });

    // Build links from edges + requirementLinks
    const allLinks = [];
    const nodeIdSet = new Set(validNodes.map(n => n.id));

    edges.forEach(e => {
      if (nodeIdSet.has(e.source) && nodeIdSet.has(e.target)) {
        const type = e.data?.relationshipType || e.label || 'default';
        allLinks.push({ from: e.source, to: e.target, type });
      }
    });

    if (requirementLinks && requirementLinks.length > 0) {
      requirementLinks.forEach(rl => {
        if (nodeIdSet.has(rl.sourceId) && nodeIdSet.has(rl.targetId)) {
          const exists = allLinks.some(l =>
            (l.from === rl.sourceId && l.to === rl.targetId) ||
            (l.from === rl.targetId && l.to === rl.sourceId)
          );
          if (!exists) {
            allLinks.push({ from: rl.sourceId, to: rl.targetId, type: rl.type || 'satisfies' });
          }
        }
      });
    }

    const reqs = layerItems.requirements;
    const satisfied = reqs.filter(r => ['approved', 'active', 'released'].includes(r.status)).length;
    const inProgress = reqs.filter(r => ['in-review', 'in-progress'].includes(r.status)).length;
    const draft = reqs.filter(r => ['draft', 'open'].includes(r.status)).length;
    const rejected = reqs.filter(r => ['rejected', 'deprecated'].includes(r.status)).length;
    const typesInUse = [...new Set(allLinks.map(l => l.type))];

    console.log('[3D] Layers:', Object.entries(layerItems).map(([k, v]) => `${k}: ${v.length}`).join(', '));
    console.log('[3D] Total nodes:', validNodes.length, '| Links:', allLinks.length);

    return {
      layerData: layerItems,
      linkData: allLinks,
      stats: { total: reqs.length, satisfied, inProgress, draft, rejected },
      linkTypesInUse: typesInUse,
    };
  }, [nodes, edges, requirementLinks]);

  // ─── SCENE SETUP ────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const W = container.clientWidth, H = container.clientHeight;
    if (W === 0 || H === 0) return;

    const scene = new THREE.Scene();
    const sceneBg = isDarkMode ? "#060a14" : "#dce4ee";
    scene.background = new THREE.Color(sceneBg);
    scene.fog = new THREE.FogExp2(sceneBg, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 300);
    const { theta, phi, radius } = camAngle.current;
    camera.position.set(
      Math.sin(theta) * Math.cos(phi) * radius,
      Math.sin(phi) * radius,
      Math.cos(theta) * Math.cos(phi) * radius
    );
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight("#1a2244", 0.9));
    const key = new THREE.DirectionalLight("#c0d8ff", 1.3);
    key.position.set(10, 20, 12); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); scene.add(key);
    scene.add(new THREE.DirectionalLight("#4a5aff", 0.4).translateOnAxis(new THREE.Vector3(-1, 0.5, -1), 15));
    scene.add(new THREE.PointLight("#2a1a5e", 0.4, 40).translateOnAxis(new THREE.Vector3(0, 1, 1), 8));

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: isDarkMode ? "#080c18" : "#c8d4e2", metalness: 0.8, roughness: 0.35, transparent: true, opacity: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -11; floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(60, 40,
      isDarkMode ? "#0d1525" : "#b0bdd0",
      isDarkMode ? "#0a0f1d" : "#c0ccda"
    );
    grid.position.y = -10.98;
    scene.add(grid);

    // Particles
    const pCount = 250, pGeom = new THREE.BufferGeometry(), pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 60;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    pGeom.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeom, new THREE.PointsMaterial({
      color: isDarkMode ? "#2244aa" : "#6688cc", size: 0.06, transparent: true, opacity: isDarkMode ? 0.4 : 0.25,
      blending: isDarkMode ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false,
    })));

    // ─── BUILD LAYERS FROM PROJECT DATA ──────────────────
    const meshMap = {}, allM = [], layerGroups = {}, labelData = [];

    Object.entries(LAYER_CONFIG).forEach(([layerKey, config]) => {
      const group = new THREE.Group();
      scene.add(group);
      layerGroups[layerKey] = group;

      const items = layerData[layerKey] || [];
      if (items.length === 0) return;

      // Layer plane
      const planeSize = Math.max(16, items.length * 3);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(planeSize, planeSize * 0.6),
        new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: isDarkMode ? 0.025 : 0.06, side: THREE.DoubleSide, depthWrite: false })
      );
      plane.rotation.x = -Math.PI / 2; plane.position.y = config.y - 0.5;
      group.add(plane);

      // Ring border
      const ringR = Math.max(8, items.length * 1.2);
      const border = new THREE.Mesh(
        new THREE.RingGeometry(ringR, ringR + 0.08, 64),
        new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.07, side: THREE.DoubleSide })
      );
      border.rotation.x = -Math.PI / 2; border.position.y = config.y - 0.49;
      group.add(border);

      // Place items in circle
      const count = items.length;
      items.forEach((item, i) => {
        const angle = (i / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
        const r = count <= 3 ? 3.5 : count <= 6 ? 5 : count <= 10 ? 6.5 : 8;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r * 0.65;

        const boxW = 2.4, boxH = layerKey === 'requirements' ? 0.5 : 0.8, boxD = 1.2;
        const col = new THREE.Color(item.color);
        const mat = new THREE.MeshPhysicalMaterial({
          color: col, metalness: 0.05, roughness: 0.3, transparent: true, opacity: 0.88,
          clearcoat: 0.6, clearcoatRoughness: 0.15, emissive: col.clone().multiplyScalar(0.06),
        });
        const mesh = new THREE.Mesh(createRoundedBox(boxW, boxH, boxD, 0.1, 2), mat);
        mesh.position.set(x, config.y, z);
        mesh.castShadow = true;
        mesh.userData = {
          id: item.id, layer: layerKey, label: item.label, reqId: item.reqId,
          desc: item.desc, itemType: item.itemType, status: item.status,
          priority: item.priority, baseColor: item.color, originalY: config.y, idx: i,
        };
        group.add(mesh);
        meshMap[item.id] = mesh;
        allM.push(mesh);

        // Status dot for requirements
        if (layerKey === 'requirements') {
          const sColor = STATUS_COLORS[item.status] || '#94a3b8';
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 10, 10),
            new THREE.MeshBasicMaterial({ color: sColor })
          );
          sphere.position.set(x + boxW / 2 - 0.15, config.y + boxH / 2 + 0.15, z);
          group.add(sphere);
          mesh.userData.statusSphere = sphere;
        }

        // Bottom accent glow
        const acc = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 1.6),
          new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: isDarkMode ? 0.07 : 0.12, blending: isDarkMode ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide })
        );
        acc.rotation.x = -Math.PI / 2;
        acc.position.set(x, config.y - boxH / 2 - 0.04, z);
        group.add(acc);
        mesh.userData.accent = acc;

        // Store label data for projection
        labelData.push({
          id: item.id, label: item.label, reqId: item.reqId,
          itemType: item.itemType, color: item.color,
          position: new THREE.Vector3(x, config.y, z),
          layerKey,
        });
      });
    });

    meshMapRef.current = meshMap;
    allMeshes.current = allM;
    layerGroupsRef.current = layerGroups;
    labelDataRef.current = labelData;

    // ─── BUILD LINKS ─────────────────────────────────────
    const linkMeshes = [];
    linkData.forEach(({ from, to, type }) => {
      const fromMesh = meshMap[from], toMesh = meshMap[to];
      if (!fromMesh || !toMesh) return;

      const fp = fromMesh.position.clone(), tp = toMesh.position.clone();
      const mid = new THREE.Vector3().addVectors(fp, tp).multiplyScalar(0.5);
      const dx = tp.x - fp.x, dz = tp.z - fp.z;
      mid.x += dz * 0.12; mid.z -= dx * 0.12;

      const pts = new THREE.QuadraticBezierCurve3(fp, mid, tp).getPoints(40);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const prog = new Float32Array(pts.length);
      for (let j = 0; j < pts.length; j++) prog[j] = j / (pts.length - 1);
      geom.setAttribute("aP", new THREE.BufferAttribute(prog, 1));

      const linkColor = LINK_TYPE_COLORS[type] || LINK_TYPE_COLORS.default;
      const mat = flowLineMat(linkColor, !isDarkMode);
      const line = new THREE.Line(geom, mat);
      line.userData = { fromId: from, toId: to, type };
      scene.add(line);
      linkMeshes.push({ line, mat, fromId: from, toId: to, type });
    });
    linkMeshesRef.current = linkMeshes;

    // ─── ANIMATION ───────────────────────────────────────
    const clock = new THREE.Clock();
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (targetCam.current) {
        camera.position.lerp(targetCam.current, 0.04);
        if (camera.position.distanceTo(targetCam.current) < 0.1) targetCam.current = null;
      }
      currentLookAt.current.lerp(new THREE.Vector3(0, 0, 0), 0.03);
      camera.lookAt(currentLookAt.current);

      // Animate nodes
      const iso = isolatedIdsRef.current;
      allM.forEach((mesh) => {
        const d = mesh.userData;
        const inIsolation = !iso || iso.has(d.id);
        const isHov = hoveredRef.current === d.id;

        mesh.position.y = d.originalY + Math.sin(t * 0.5 + d.idx * 1.3) * 0.06;
        mesh.rotation.y = Math.sin(t * 0.15 + d.idx * 0.7) * 0.03;

        const targetScale = inIsolation ? (isHov ? 1.15 : 1) : 0.5;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

        const targetOpacity = inIsolation ? 0.88 : 0.08;
        mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.08;
        mesh.material.emissive = new THREE.Color(d.baseColor).multiplyScalar(
          inIsolation ? (isHov ? 0.2 : 0.06) : 0.01
        );

        if (d.accent) d.accent.material.opacity = inIsolation ? (isHov ? 0.2 : 0.07) : 0.01;
        if (d.statusSphere) {
          d.statusSphere.position.y = d.originalY + 0.4 + Math.sin(t * 0.5 + d.idx * 1.3) * 0.06;
          d.statusSphere.material.opacity = inIsolation ? 1 : 0.1;
          d.statusSphere.material.transparent = true;
        }
      });

      // Animate links
      linkMeshes.forEach((lm) => {
        lm.mat.uniforms.uTime.value = t;
        const h = hoveredRef.current;
        const linkInIsolation = !iso || (iso.has(lm.fromId) && iso.has(lm.toId));
        if (!linkInIsolation) {
          lm.mat.uniforms.uOpacity.value += (0.02 - lm.mat.uniforms.uOpacity.value) * 0.08;
        } else {
          const target = h
            ? (lm.fromId === h || lm.toId === h ? 1.0 : 0.06)
            : 0.3;
          lm.mat.uniforms.uOpacity.value += (target - lm.mat.uniforms.uOpacity.value) * 0.1;
        }
      });

      // Project label positions to 2D screen space
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const newPositions = labelDataRef.current.map(lb => {
          const pos = lb.position.clone();
          pos.y += 1.0; // offset above node
          pos.project(camera);
          return {
            ...lb,
            x: (pos.x * 0.5 + 0.5) * rect.width,
            y: (-pos.y * 0.5 + 0.5) * rect.height,
            visible: pos.z < 1 && pos.z > 0,
          };
        });
        setLabelPositions(newPositions);
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animRef.current);
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [layerData, linkData, isDarkMode]);

  // Layer visibility
  useEffect(() => {
    Object.entries(layerGroupsRef.current).forEach(([key, group]) => { group.visible = visibleLayers[key]; });
  }, [visibleLayers]);

  // Link visibility
  useEffect(() => {
    linkMeshesRef.current.forEach(lm => {
      const fromMesh = meshMapRef.current[lm.fromId];
      const toMesh = meshMapRef.current[lm.toId];
      const fromLayer = fromMesh?.userData?.layer;
      const toLayer = toMesh?.userData?.layer;
      const typeVisible = showLinkTypes[lm.type] !== false;
      const layersVisible = (fromLayer ? visibleLayers[fromLayer] : true) && (toLayer ? visibleLayers[toLayer] : true);
      lm.line.visible = typeVisible && layersVisible;
    });
  }, [showLinkTypes, visibleLayers]);

  // ─── MOUSE ─────────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    if (!mountRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    mouse2d.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse2d.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging.current) {
      const dx = (e.clientX - lastMouse.current.x);
      const dy = (e.clientY - lastMouse.current.y);
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;
      camAngle.current.theta += dx * 0.003;
      camAngle.current.phi = Math.max(0.15, Math.min(1.4, camAngle.current.phi + dy * 0.003));
      const { theta, phi, radius } = camAngle.current;
      targetCam.current = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * radius,
        Math.sin(phi) * radius,
        Math.cos(theta) * Math.cos(phi) * radius
      );
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    raycaster.current.setFromCamera(mouse2d.current, cameraRef.current);
    const visibleMeshes = allMeshes.current.filter(m => layerGroupsRef.current[m.userData.layer]?.visible);
    const hits = raycaster.current.intersectObjects(visibleMeshes);
    if (hits.length > 0) {
      hoveredRef.current = hits[0].object.userData.id;
      setHoveredNode(hits[0].object.userData.id);
      mountRef.current.style.cursor = "pointer";
    } else {
      hoveredRef.current = null;
      setHoveredNode(null);
      mountRef.current.style.cursor = isDragging.current ? "grabbing" : "grab";
    }
  }, []);

  // Traverse link graph to find all connected nodes from a starting node
  const getConnectedTree = useCallback((startId) => {
    const visited = new Set();
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      linkData.forEach(l => {
        if (l.from === current && !visited.has(l.to)) queue.push(l.to);
        if (l.to === current && !visited.has(l.from)) queue.push(l.from);
      });
    }
    return visited;
  }, [linkData]);

  // Double-click: isolate tree or reset
  const lastClickTime = useRef(0);
  const lastClickId = useRef(null);

  const handleClick = useCallback(() => {
    if (isDragging.current || dragMoved.current) return;
    const now = Date.now();
    const clickedId = hoveredRef.current;

    if (clickedId && clickedId === lastClickId.current && (now - lastClickTime.current) < 350) {
      if (isolatedIds && isolatedIds.has(clickedId)) {
        setIsolatedIds(null);
      } else {
        const tree = getConnectedTree(clickedId);
        setIsolatedIds(tree);
      }
      setSelectedId(clickedId);
      lastClickTime.current = 0;
      return;
    }

    lastClickTime.current = now;
    lastClickId.current = clickedId;

    if (clickedId) {
      setSelectedId(prev => prev === clickedId ? null : clickedId);
    } else if (!clickedId && isolatedIds) {
      setIsolatedIds(null);
    }
  }, [getConnectedTree, isolatedIds]);

  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    dragMoved.current = false;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (!dragMoved.current) {
      handleClick();
    }
    dragMoved.current = false;
  }, [handleClick]);

  // Wheel zoom via native listener (non-passive, so preventDefault works)
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      camAngle.current.radius = Math.max(8, Math.min(60, camAngle.current.radius + e.deltaY * 0.02));
      const { theta, phi, radius } = camAngle.current;
      targetCam.current = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * radius,
        Math.sin(phi) * radius,
        Math.cos(theta) * Math.cos(phi) * radius
      );
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ─── FIND HELPERS ──────────────────────────────────────
  const findItem = useCallback((id) => {
    for (const [layerKey, items] of Object.entries(layerData)) {
      const item = items.find(it => it.id === id);
      if (item) return { ...item, layerKey, layerLabel: LAYER_CONFIG[layerKey].label, layerColor: LAYER_CONFIG[layerKey].color };
    }
    return null;
  }, [layerData]);

  const getLinksFor = useCallback((id) => linkData.filter(l => l.from === id || l.to === id), [linkData]);

  const selectedInfo = selectedId ? findItem(selectedId) : null;
  const hoveredInfo = hoveredNode ? findItem(hoveredNode) : null;
  const displayInfo = selectedInfo || hoveredInfo;
  const displayLinks = displayInfo ? getLinksFor(displayInfo.id) : [];

  const layerCounts = useMemo(() => ({
    requirements: layerData.requirements?.length || 0,
    systems: layerData.systems?.length || 0,
    subsystems: layerData.subsystems?.length || 0,
    functions: layerData.functions?.length || 0,
    hardware: layerData.hardware?.length || 0,
  }), [layerData]);

  // ─── RENDER ────────────────────────────────────────────
  return (
    <div className={className} style={{
      width: "100%", height: "100%", background: isDarkMode ? "#060a14" : "#dce4ee",
      position: "relative", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      overflow: "hidden", userSelect: "none", color: isDarkMode ? "#e2e8f0" : "#1e293b", ...style,
    }}>

      {/* ─── TOP BAR ───────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "10px 16px",
        background: isDarkMode
          ? "linear-gradient(180deg, rgba(6,10,20,0.97) 0%, transparent 100%)"
          : "linear-gradient(180deg, rgba(220,228,238,0.97) 0%, transparent 100%)",
        display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#3a5a8a", marginRight: "6px" }}>
          3D TRACEABILITY
        </div>
        <div style={{ width: "1px", height: "18px", background: "#1a2a44" }} />

        {Object.entries(LAYER_CONFIG).map(([key, config]) => (
          <button key={key} onClick={() => setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }))}
            style={{
              background: visibleLayers[key] ? `${config.color}18` : "rgba(255,255,255,0.02)",
              border: `1px solid ${visibleLayers[key] ? `${config.color}50` : "rgba(255,255,255,0.06)"}`,
              color: visibleLayers[key] ? config.color : "#334",
              padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
              fontSize: "11px", fontWeight: 500, transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: "5px",
            }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: visibleLayers[key] ? config.color : "#222" }} />
            {config.icon} {config.label} ({layerCounts[key]})
          </button>
        ))}

        {linkTypesInUse.length > 0 && <>
          <div style={{ width: "1px", height: "18px", background: "#1a2a44" }} />
          {linkTypesInUse.map(type => {
            const color = LINK_TYPE_COLORS[type] || LINK_TYPE_COLORS.default;
            return (
              <button key={type}
                onClick={() => setShowLinkTypes(prev => ({ ...prev, [type]: !prev[type] }))}
                style={{
                  background: showLinkTypes[type] !== false ? `${color}15` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${showLinkTypes[type] !== false ? `${color}40` : "rgba(255,255,255,0.06)"}`,
                  color: showLinkTypes[type] !== false ? color : "#334",
                  padding: "3px 8px", borderRadius: "5px", cursor: "pointer",
                  fontSize: "10px", fontWeight: 500, transition: "all 0.2s",
                }}>
                {type}
              </button>
            );
          })}
        </>}
      </div>

      {/* ─── STATS ──────────────────────────────────────── */}
      {stats.total > 0 && (
        <div style={{
          position: "absolute", top: 52, right: 16, zIndex: 10,
          background: "rgba(8,12,24,0.85)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(74,158,255,0.1)", borderRadius: "12px",
          padding: "12px 16px", minWidth: "160px",
        }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#3a5a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Krav ({stats.total})
          </div>
          {[
            { label: "Godkända", value: stats.satisfied, color: "#22c55e" },
            { label: "Pågående", value: stats.inProgress, color: "#f59e0b" },
            { label: "Utkast", value: stats.draft, color: "#94a3b8" },
            { label: "Avvisade", value: stats.rejected, color: "#ef4444" },
          ].filter(s => s.value > 0).map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "3px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: "10px", color: "#6a8aaa" }}>{s.label}</span>
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
          <div style={{ marginTop: "6px" }}>
            <div style={{ height: "3px", borderRadius: "2px", background: "#1a1a2e", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(stats.satisfied / stats.total) * 100}%`, background: "#22c55e" }} />
              <div style={{ width: `${(stats.inProgress / stats.total) * 100}%`, background: "#f59e0b" }} />
              <div style={{ width: `${(stats.draft / stats.total) * 100}%`, background: "#94a3b8" }} />
            </div>
            <div style={{ fontSize: "9px", color: "#3a5a7a", marginTop: "3px", textAlign: "right" }}>
              {Math.round((stats.satisfied / stats.total) * 100)}% godkända
            </div>
          </div>
        </div>
      )}

      {/* ─── DETAIL PANEL ──────────────────────────────── */}
      {displayInfo && (
        <div style={{
          position: "absolute", bottom: 20, left: 20, zIndex: 10,
          background: "rgba(8,12,24,0.9)", backdropFilter: "blur(20px)",
          border: `1px solid ${displayInfo.layerColor}25`,
          borderRadius: "14px", padding: "16px 20px", maxWidth: "360px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "tvSlideUp 0.2s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{
              padding: "2px 7px", borderRadius: "5px", fontSize: "9px", fontWeight: 700,
              background: `${displayInfo.layerColor}20`, color: displayInfo.layerColor,
              textTransform: "uppercase",
            }}>{displayInfo.layerLabel}</span>
            <span style={{
              padding: "2px 7px", borderRadius: "5px", fontSize: "9px", fontWeight: 600,
              background: `${displayInfo.color}20`, color: displayInfo.color,
            }}>{displayInfo.itemType}</span>
            {displayInfo.reqId && (
              <span style={{ fontSize: "10px", color: "#3a5a7a", fontFamily: "monospace" }}>{displayInfo.reqId}</span>
            )}
            {displayInfo.status && (
              <span style={{
                padding: "2px 7px", borderRadius: "8px", fontSize: "9px", fontWeight: 600,
                background: `${STATUS_COLORS[displayInfo.status] || '#94a3b8'}20`,
                color: STATUS_COLORS[displayInfo.status] || '#94a3b8',
              }}>{displayInfo.status}</span>
            )}
          </div>
          <div style={{ color: "#e8eef8", fontSize: "15px", fontWeight: 700, marginBottom: "3px" }}>{displayInfo.label}</div>
          {displayInfo.desc && (
            <div style={{ color: "#5a7090", fontSize: "11px", lineHeight: 1.5, marginBottom: "8px" }}>{displayInfo.desc}</div>
          )}
          {displayLinks.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "6px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, color: "#3a5a7a", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Kopplingar ({displayLinks.length})
              </div>
              {displayLinks.slice(0, 8).map((link, i) => {
                const otherId = link.from === displayInfo.id ? link.to : link.from;
                const other = findItem(otherId);
                const linkColor = LINK_TYPE_COLORS[link.type] || LINK_TYPE_COLORS.default;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#6a8aaa", marginBottom: "2px" }}>
                    <span style={{ color: linkColor }}>{link.from === displayInfo.id ? "→" : "←"}</span>
                    <span style={{ color: linkColor, fontWeight: 500, fontSize: "9px" }}>{link.type}</span>
                    <span style={{ color: other?.color || "#888" }}>{other?.label || otherId}</span>
                  </div>
                );
              })}
              {displayLinks.length > 8 && (
                <div style={{ fontSize: "9px", color: "#3a5a7a", marginTop: "2px" }}>+{displayLinks.length - 8} till...</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── LAYER LABELS (left side) ──────────────────── */}
      <div style={{
        position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
        zIndex: 10, display: "flex", flexDirection: "column", gap: "32px",
      }}>
        {Object.entries(LAYER_CONFIG).map(([key, config]) => (
          visibleLayers[key] && layerCounts[key] > 0 && (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px", opacity: 0.6 }}>
              <div style={{ width: "2px", height: "20px", borderRadius: "1px", background: config.color }} />
              <div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: config.color, textTransform: "uppercase", letterSpacing: "1px" }}>{config.label}</div>
                <div style={{ fontSize: "8px", color: "#3a5a7a" }}>{layerCounts[key]} objekt</div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* ─── 3D TEXT LABELS (projected to screen) ──────── */}
      {labelPositions.filter(l => l.visible && visibleLayers[l.layerKey]).map((lb, idx) => {
        const inIso = !isolatedIds || isolatedIds.has(lb.id);
        return (
        <div key={`lbl-${idx}`} style={{
          position: "absolute", left: lb.x, top: lb.y,
          transform: "translate(-50%, -50%)",
          zIndex: 5, pointerEvents: "none", textAlign: "center",
          opacity: inIso
            ? (hoveredRef.current ? (hoveredRef.current === lb.id ? 1 : 0.35) : 0.85)
            : 0.06,
          transition: "opacity 0.3s",
        }}>
          {lb.reqId && (
            <div style={{
              color: lb.color, fontSize: "8px", fontWeight: 700, fontFamily: "monospace",
              textShadow: "0 0 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,1)",
              marginBottom: "1px", letterSpacing: "0.3px",
            }}>{lb.reqId}</div>
          )}
          <div style={{
            color: hoveredRef.current === lb.id ? "#ffffff" : "#c8d8ea",
            fontSize: hoveredRef.current === lb.id ? "12px" : "10px",
            fontWeight: 600, whiteSpace: "nowrap", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis",
            textShadow: "0 0 10px rgba(0,0,0,1), 0 0 5px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)",
            transition: "all 0.15s",
          }}>{lb.label}</div>
          <div style={{
            color: `${lb.color}90`, fontSize: "7px",
            textShadow: "0 0 6px rgba(0,0,0,1)",
            textTransform: "uppercase", letterSpacing: "0.3px",
          }}>{lb.itemType}</div>
        </div>
        );
      })}

      {/* ─── EMPTY STATE ───────────────────────────────── */}
      {nodes.filter(n => n.data?.itemType && !['textAnnotation','postIt','postit','image','whiteboard_image','img','drawing'].includes(n.data.itemType)).length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 10, textAlign: "center", color: "#3a5a8a",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔮</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Inget projektdata</div>
          <div style={{ fontSize: "12px", color: "#2a4a6a", marginTop: "4px" }}>
            Lägg till krav, system och hårdvara i PLM-vyn för att se dem här
          </div>
        </div>
      )}

      {/* ─── ISOLATION MODE INDICATOR ──────────────── */}
      {isolatedIds ? (
        <div style={{
          position: "absolute", bottom: 20, right: 20, zIndex: 10,
          background: "rgba(8,12,24,0.9)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(74,158,255,0.2)", borderRadius: "10px",
          padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{ fontSize: "11px", color: "#6a8aaa" }}>
            🔍 Isolerat träd — <strong style={{ color: "#4a9eff" }}>{isolatedIds.size}</strong> noder
          </div>
          <button onClick={() => setIsolatedIds(null)} style={{
            background: "rgba(74,158,255,0.15)", border: "1px solid rgba(74,158,255,0.3)",
            color: "#4a9eff", padding: "4px 10px", borderRadius: "6px",
            cursor: "pointer", fontSize: "10px", fontWeight: 600,
          }}>
            ✕ Visa alla
          </button>
        </div>
      ) : (
        <div style={{
          position: "absolute", bottom: 16, right: 16, zIndex: 10,
          fontSize: "9px", color: "#2a4a6a", opacity: 0.5,
        }}>
          Dubbelklicka på nod för att isolera trädvy
        </div>
      )}

      {/* ─── CANVAS ────────────────────────────────────── */}
      <div ref={mountRef} onMouseMove={onMouseMove} onMouseDown={onMouseDown}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, cursor: "grab" }}
      />

      <style>{`@keyframes tvSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
