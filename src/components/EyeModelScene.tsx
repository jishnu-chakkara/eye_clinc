"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { EyeStoryChapter } from "@/data/story";
import { prefersReducedMotion } from "@/lib/gsap-motion";

interface EyeModelSceneProps {
  chapter: EyeStoryChapter;
  exploded: boolean;
}

function createIrisTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;

    const baseGrad = ctx.createRadialGradient(cx, cy, maxR * 0.28, cx, cy, maxR);
    baseGrad.addColorStop(0, "#102327");
    baseGrad.addColorStop(0.32, "#245759");
    baseGrad.addColorStop(0.55, "#6b7d65");
    baseGrad.addColorStop(0.76, "#b48a56");
    baseGrad.addColorStop(0.92, "#19363a");
    baseGrad.addColorStop(1, "#0d1b1e");

    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Radial iris stroma fibres
    for (let i = 0; i < 240; i++) {
      const angle = (i / 240) * Math.PI * 2;
      const innerR = maxR * (0.31 + (i % 5) * 0.015);
      const outerR = maxR * (0.88 - (i % 3) * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(
        cx + Math.cos(angle + 0.015) * outerR,
        cy + Math.sin(angle + 0.015) * outerR
      );
      ctx.strokeStyle =
        i % 3 === 0
          ? "rgba(214, 178, 120, 0.28)"
          : i % 2 === 0
          ? "rgba(42, 118, 120, 0.34)"
          : "rgba(255, 245, 224, 0.14)";
      ctx.lineWidth = i % 4 === 0 ? 1.8 : 1;
      ctx.stroke();
    }

    // Pupil aperture
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.29, 0, Math.PI * 2);
    ctx.fillStyle = "#06090b";
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRetinaTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, size * 0.52);
    grad.addColorStop(0, "#b86b4b");
    grad.addColorStop(0.24, "#8e4a38");
    grad.addColorStop(0.65, "#4c2c2a");
    grad.addColorStop(1, "#1e2a2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle retinal OCT measurement grid
    ctx.strokeStyle = "rgba(130, 198, 199, 0.28)";
    ctx.lineWidth = 1;
    for (let r = 44; r <= 200; r += 39) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Optic disc highlight offset slightly nasally
    const discX = cx + 66;
    const discY = cy - 12;
    const discGrad = ctx.createRadialGradient(discX, discY, 4, discX, discY, 26);
    discGrad.addColorStop(0, "rgba(255, 232, 200, 0.92)");
    discGrad.addColorStop(0.6, "rgba(230, 168, 120, 0.55)");
    discGrad.addColorStop(1, "rgba(230, 168, 120, 0)");
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(discX, discY, 26, 0, Math.PI * 2);
    ctx.fill();

    // Fine branching vessels from optic disc
    ctx.strokeStyle = "rgba(120, 26, 22, 0.55)";
    ctx.lineWidth = 1.6;
    const branches = [
      [-1, -0.7],
      [-1.1, 0.65],
      [-0.6, -1.0],
      [-0.55, 0.95],
      [0.45, -0.75],
      [0.5, 0.7],
    ];
    branches.forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(discX, discY);
      ctx.quadraticCurveTo(
        discX + dx * 65,
        discY + dy * 35,
        discX + dx * 135,
        discY + dy * 115
      );
      ctx.stroke();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function EyeModelScene({ chapter, exploded }: EyeModelSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const sceneNodesRef = useRef<{
    rig: THREE.Group;
    corneaGroup: THREE.Group;
    irisGroup: THREE.Group;
    pupilMesh: THREE.Mesh;
    iolGroup: THREE.Group;
    retinaGroup: THREE.Group;
    raysGroup: THREE.Group;
    octGroup: THREE.Group;
    rayMaterials: THREE.LineBasicMaterial[];
    octMaterial: THREE.MeshBasicMaterial;
    dragOffset: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 500;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    camera.position.set(0, 0.15, 6.1);

    // Architectural clinical lighting
    const hemi = new THREE.HemisphereLight(0xf6f9f9, 0x16262a, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffcf5, 2.2);
    keyLight.position.set(4.5, 4.2, 5.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9fd3d4, 1.15);
    fillLight.position.set(-4.8, -1.5, 3.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x4fc3c6, 1.6);
    rimLight.position.set(-1.5, 3.2, -5.0);
    scene.add(rimLight);

    // Master optical rig
    const rig = new THREE.Group();
    scene.add(rig);

    // Reference calibration ring around eye equator
    const orbitRingGeo = new THREE.TorusGeometry(1.78, 0.008, 12, 96);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x82c6c7,
      transparent: true,
      opacity: 0.28,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2;
    rig.add(orbitRing);

    // 1. Cornea Dome (Anterior refractive shell)
    const corneaGroup = new THREE.Group();
    const corneaGeo = new THREE.SphereGeometry(
      1.08,
      48,
      36,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.44
    );
    const corneaMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6f7f7,
      roughness: 0.06,
      metalness: 0.02,
      transmission: 0.84,
      thickness: 0.35,
      ior: 1.376,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const corneaMesh = new THREE.Mesh(corneaGeo, corneaMat);
    corneaMesh.rotation.x = Math.PI / 2;
    corneaMesh.position.z = 0.08;
    corneaGroup.add(corneaMesh);

    const limbusRingGeo = new THREE.TorusGeometry(1.06, 0.015, 16, 72);
    const limbusRingMat = new THREE.MeshStandardMaterial({
      color: 0x82c6c7,
      roughness: 0.3,
      metalness: 0.4,
    });
    const limbusRing = new THREE.Mesh(limbusRingGeo, limbusRingMat);
    limbusRing.position.z = 0.28;
    corneaGroup.add(limbusRing);
    rig.add(corneaGroup);

    // 2. Iris & Dynamic Pupil Aperture
    const irisGroup = new THREE.Group();
    const irisTexture = createIrisTexture();
    const irisGeo = new THREE.RingGeometry(0.32, 0.98, 64, 4);
    const irisMat = new THREE.MeshStandardMaterial({
      map: irisTexture,
      roughness: 0.45,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const irisMesh = new THREE.Mesh(irisGeo, irisMat);
    irisMesh.position.z = 0.32;
    irisGroup.add(irisMesh);

    const pupilGeo = new THREE.CircleGeometry(0.33, 48);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x060a0c });
    const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
    pupilMesh.position.z = 0.315;
    irisGroup.add(pupilMesh);
    rig.add(irisGroup);

    // 3. Intraocular / Crystalline Lens (IOL + C-loop haptics)
    const iolGroup = new THREE.Group();
    const iolOpticGeo = new THREE.SphereGeometry(0.56, 40, 28);
    iolOpticGeo.scale(1, 1, 0.36);
    const iolMat = new THREE.MeshPhysicalMaterial({
      color: 0xdff5f4,
      roughness: 0.08,
      metalness: 0.04,
      transmission: 0.78,
      ior: 1.47,
      clearcoat: 1,
      transparent: true,
      opacity: 0.88,
    });
    const iolOptic = new THREE.Mesh(iolOpticGeo, iolMat);
    iolGroup.add(iolOptic);

    const iolRimGeo = new THREE.TorusGeometry(0.56, 0.014, 12, 64);
    const iolRimMat = new THREE.MeshStandardMaterial({
      color: 0x99d9da,
      roughness: 0.25,
      metalness: 0.65,
    });
    const iolRim = new THREE.Mesh(iolRimGeo, iolRimMat);
    iolGroup.add(iolRim);

    // Two curved C-loop haptics
    const createHaptic = (flip: number) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.54 * flip, 0.08 * flip, 0),
        new THREE.Vector3(0.76 * flip, 0.46 * flip, 0),
        new THREE.Vector3(0.45 * flip, 0.84 * flip, 0),
        new THREE.Vector3(0.05 * flip, 0.9 * flip, 0),
      ]);
      const hapticGeo = new THREE.TubeGeometry(curve, 24, 0.018, 8, false);
      return new THREE.Mesh(hapticGeo, iolRimMat);
    };
    iolGroup.add(createHaptic(1));
    iolGroup.add(createHaptic(-1));
    rig.add(iolGroup);

    // 4. Posterior Sclera Shell + Retinal Macula Cup + Optic Nerve Stem
    const retinaGroup = new THREE.Group();

    const scleraGeo = new THREE.SphereGeometry(
      1.34,
      48,
      36,
      0,
      Math.PI * 2,
      Math.PI * 0.42,
      Math.PI * 0.58
    );
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xe9e6de,
      roughness: 0.52,
      metalness: 0.05,
      side: THREE.FrontSide,
    });
    const scleraMesh = new THREE.Mesh(scleraGeo, scleraMat);
    scleraMesh.rotation.x = Math.PI / 2;
    retinaGroup.add(scleraMesh);

    const retinaTexture = createRetinaTexture();
    const innerRetinaGeo = new THREE.SphereGeometry(
      1.26,
      48,
      36,
      0,
      Math.PI * 2,
      Math.PI * 0.46,
      Math.PI * 0.54
    );
    const innerRetinaMat = new THREE.MeshStandardMaterial({
      map: retinaTexture,
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.BackSide,
    });
    const innerRetinaMesh = new THREE.Mesh(innerRetinaGeo, innerRetinaMat);
    innerRetinaMesh.rotation.x = Math.PI / 2;
    retinaGroup.add(innerRetinaMesh);

    // Optic nerve stalk
    const nerveGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.72, 24);
    const nerveMat = new THREE.MeshStandardMaterial({
      color: 0xded9cf,
      roughness: 0.55,
    });
    const nerveMesh = new THREE.Mesh(nerveGeo, nerveMat);
    nerveMesh.rotation.x = Math.PI / 2;
    nerveMesh.position.set(0.28, -0.04, -1.52);
    retinaGroup.add(nerveMesh);

    rig.add(retinaGroup);

    // 5. Optical Focal Rays (converging through cornea & IOL to fovea)
    const raysGroup = new THREE.Group();
    const rayMaterials: THREE.LineBasicMaterial[] = [];
    const rayOffsets = [
      [0, 0.45],
      [0, -0.45],
      [0.45, 0],
      [-0.45, 0],
      [0.32, 0.32],
      [-0.32, -0.32],
    ];
    rayOffsets.forEach(([ox, oy]) => {
      const mat = new THREE.LineBasicMaterial({
        color: 0x82c6c7,
        transparent: true,
        opacity: 0.65,
      });
      rayMaterials.push(mat);
      const pts = [
        new THREE.Vector3(ox, oy, 2.2),
        new THREE.Vector3(ox * 0.72, oy * 0.72, 0.65),
        new THREE.Vector3(ox * 0.42, oy * 0.42, 0.05),
        new THREE.Vector3(0, 0, -1.24),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      raysGroup.add(new THREE.Line(geo, mat));
    });
    rig.add(raysGroup);

    // 6. Retinal OCT Scan Laser Plane (illuminates in Chapter 03)
    const octGroup = new THREE.Group();
    const octGeo = new THREE.PlaneGeometry(2.1, 0.95);
    const octMaterial = new THREE.MeshBasicMaterial({
      color: 0x4fd1c5,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const octPlane = new THREE.Mesh(octGeo, octMaterial);
    octPlane.position.set(0, 0, -0.95);
    octGroup.add(octPlane);
    rig.add(octGroup);

    const dragOffset = { x: 0, y: 0 };
    sceneNodesRef.current = {
      rig,
      corneaGroup,
      irisGroup,
      pupilMesh,
      iolGroup,
      retinaGroup,
      raysGroup,
      octGroup,
      rayMaterials,
      octMaterial,
      dragOffset,
    };

    // Initial pose
    const pose = chapter.pose;
    rig.rotation.set(pose.rotX, pose.rotY, 0);
    corneaGroup.position.z = pose.corneaZ;
    irisGroup.position.z = pose.irisZ;
    iolGroup.position.z = pose.iolZ;
    retinaGroup.position.z = pose.retinaZ;
    pupilMesh.scale.setScalar(pose.pupilScale);

    // Pointer drag-to-orbit on canvas
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    const domEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      domEl.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragOffset.y += dx * 0.008;
      dragOffset.x = THREE.MathUtils.clamp(dragOffset.x + dy * 0.006, -0.55, 0.55);
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      domEl.releasePointerCapture?.(e.pointerId);
    };

    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      if (!prefersReducedMotion()) {
        // Gentle idle optical float and OCT plane sweep
        orbitRing.rotation.z = t * 0.14;
        octPlane.position.y = Math.sin(t * 2.1) * 0.28;
        if (!isDragging) {
          dragOffset.x *= 0.96;
        }
      }

      rig.rotation.x += (poseRef.current.rotX + dragOffset.x - rig.rotation.x) * 0.1;
      rig.rotation.y += (poseRef.current.rotY + dragOffset.y - rig.rotation.y) * 0.1;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      irisTexture.dispose();
      retinaTexture.dispose();
      renderer.dispose();
    };
  }, []);

  const poseRef = useRef(chapter.pose);

  // GSAP transitions whenever active storytelling chapter or exploded view changes
  useEffect(() => {
    poseRef.current = chapter.pose;
    const nodes = sceneNodesRef.current;
    if (!nodes) return;

    const explodeMul = exploded ? 1.45 : 1;
    const target = {
      corneaZ: chapter.pose.corneaZ * explodeMul + (exploded ? 0.25 : 0),
      irisZ: chapter.pose.irisZ * explodeMul + (exploded ? 0.1 : 0),
      iolZ: chapter.pose.iolZ * explodeMul,
      retinaZ: chapter.pose.retinaZ * explodeMul - (exploded ? 0.22 : 0),
      pupilScale: chapter.pose.pupilScale,
      raysOpacity: chapter.pose.raysOpacity,
      octOpacity: chapter.pose.octOpacity,
    };

    const dur = prefersReducedMotion() ? 0.01 : 0.85;

    gsap.to(nodes.corneaGroup.position, {
      z: target.corneaZ,
      duration: dur,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(nodes.irisGroup.position, {
      z: target.irisZ,
      duration: dur,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(nodes.iolGroup.position, {
      z: target.iolZ,
      duration: dur,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(nodes.retinaGroup.position, {
      z: target.retinaZ,
      duration: dur,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(nodes.pupilMesh.scale, {
      x: target.pupilScale,
      y: target.pupilScale,
      duration: dur,
      ease: "power2.out",
      overwrite: "auto",
    });
    nodes.rayMaterials.forEach((mat) => {
      gsap.to(mat, {
        opacity: target.raysOpacity,
        duration: dur,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
    gsap.to(nodes.octMaterial, {
      opacity: target.octOpacity * 0.34,
      duration: dur,
      ease: "power2.out",
      overwrite: "auto",
    });
    // Ease manual drag back toward zero when switching chapters
    gsap.to(nodes.dragOffset, {
      x: 0,
      y: 0,
      duration: dur,
      ease: "power3.out",
      overwrite: "auto",
    });
  }, [chapter, exploded]);

  if (webglFailed) {
    return (
      <div className="eye-fallback" role="img" aria-label={chapter.title}>
        <svg viewBox="0 0 420 300" width="100%" height="100%">
          <circle cx="235" cy="150" r="102" fill="none" stroke="#82c6c7" strokeWidth="1.5" opacity="0.45" />
          <path d="M135 80 C95 110, 95 190, 135 220" fill="none" stroke="#e6f7f7" strokeWidth="2.5" />
          <ellipse cx="165" cy="150" rx="14" ry="44" fill="rgba(130,198,199,0.28)" stroke="#99d9da" strokeWidth="1.5" />
          <path d="M235 48 A102 102 0 1 1 235 252" fill="none" stroke="#b86b4b" strokeWidth="3" />
          <line x1="40" y1="120" x2="335" y2="150" stroke="#82c6c7" strokeWidth="1.2" opacity="0.7" />
          <line x1="40" y1="180" x2="335" y2="150" stroke="#82c6c7" strokeWidth="1.2" opacity="0.7" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="eye-canvas-host"
      data-cursor="orbit"
      aria-label={`Interactive 3D eye model: ${chapter.title}. Drag to rotate.`}
    />
  );
}
