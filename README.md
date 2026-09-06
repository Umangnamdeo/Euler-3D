# Euler 3D

<p align="center">
  <svg width="460" height="120" viewBox="0 0 460 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Outer Rounded Capsule -->
    <rect width="460" height="120" rx="28" fill="#05070c"/>
    
    <!-- Coordinate / Orbital Sphere Motif -->
    <g transform="translate(42, 12)">
      <!-- Faint Outer Circle -->
      <circle cx="48" cy="48" r="44" stroke="#2a2e39" stroke-width="1.2"/>
      
      <!-- Primary Orbital Rings -->
      <ellipse cx="48" cy="48" rx="46" ry="17" stroke="#ffffff" stroke-width="2" transform="rotate(-20 48 48)"/>
      <ellipse cx="48" cy="48" rx="44" ry="14" stroke="#4b5563" stroke-width="1.2" transform="rotate(70 48 48)"/>
      <ellipse cx="48" cy="48" rx="45" ry="32" stroke="#2a2e39" stroke-width="1" stroke-dasharray="3 3"/>
      
      <!-- Vertical Vector Line with Endpoints -->
      <line x1="48" y1="6" x2="48" y2="90" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="48" cy="10" r="3.5" fill="#ffffff"/>
      <circle cx="48" cy="48" r="4.5" fill="#ffffff"/>
      
      <!-- Secondary Points / Momentum Dots -->
      <circle cx="76" cy="34" r="3" fill="#ffffff"/>
      <circle cx="20" cy="62" r="2.5" fill="#9ca3af"/>
      <circle cx="64" cy="74" r="2" fill="#6b7280"/>
      <circle cx="34" cy="28" r="1.8" fill="#4b5563"/>
    </g>

    <!-- Typography: EULER 3D -->
    <text x="172" y="66" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', Roboto, sans-serif" font-weight="900" font-size="44" letter-spacing="4">EULER<tspan fill="#9ca3af">3D</tspan></text>
    
    <!-- Subtitle: COMPUTATIONAL DYNAMICS -->
    <text x="174" y="88" fill="#6b7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Text', Roboto, monospace" font-weight="600" font-size="12" letter-spacing="5">COMPUTATIONAL DYNAMICS</text>
  </svg>
</p>

<p align="center">
  <b>Real-Time GPU Computational Fluid Dynamics & 3D Vector Simulation</b>
</p>

<p align="center">
  <a href="https://Umangnamdeo.github.io/Euler-3d/"><strong>Explore Live Simulation »</strong></a>
</p>

---

## ⚡ Overview

**Euler 3D** is an interactive, browser-based numerical simulation engine designed to compute and visualize complex fluid behavior, vector fields, and spatial dynamics directly inside modern web browsers.

By leveraging WebGL and custom GLSL fragment shaders, continuous partial differential equations (the Euler equations for fluid flow) are mapped onto GPU floating-point textures. This parallelized solver pipeline calculates velocity advection, pressure projection, and vorticity confinement in real time, delivering a responsive 60 FPS visual experience with zero local installation or plugins.

---

## 🚀 Live Demo

You can interact with the simulation directly on GitHub Pages:

👉 **[https://Umangnamdeo.github.io/Euler-3d/](https://Umangnamdeo.github.io/Euler-3d/)**

---

## ✨ Features

* **GPU-Accelerated Solving:** Solves velocity, density, and pressure fields concurrently on the GPU using ping-pong framebuffers.
* **Interactive Controls:** Direct pointer interaction allows users to perturb fluid paths, inject momentum, and place virtual obstacles.
* **Volumetric & Vector Modes:** Switch dynamically between raymarched volumetric density fields, particle streamlines, and directional vector paths.
* **Pure Web Stack:** Zero heavyweight backend dependencies—runs natively on any WebGL-compatible desktop or mobile browser.

---

## 🛠️ Tech Stack

* **Rendering Engine:** WebGL / Three.js
* **Shading Language:** GLSL (Fragment & Vertex Shaders)
* **Frontend Logic:** Modern JavaScript (ES6+), HTML5 Canvas
* **Deployment:** GitHub Pages

---

## 💻 Local Development Setup

To run or modify the project locally:

1. Clone the repository:
   ```bash
   git clone [https://github.com/Umangnamdeo/Euler-3d.git](https://github.com/Umangnamdeo/Euler-3d.git)
