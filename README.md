# Euler 3D

<p align="center">
  <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Dark Background Glow -->
    <circle cx="100" cy="100" r="85" fill="#0b0f19" stroke="#1f293d" stroke-width="2"/>
    <circle cx="100" cy="100" r="65" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>
    
    <!-- Isometric Cube Frame (Euler Grid) -->
    <!-- Top Face -->
    <polygon points="100,50 145,75 100,100 55,75" fill="#1e293b" stroke="#60a5fa" stroke-width="2" opacity="0.9"/>
    <!-- Left Face -->
    <polygon points="55,75 100,100 100,150 55,125" fill="#0f172a" stroke="#3b82f6" stroke-width="2" opacity="0.8"/>
    <!-- Right Face -->
    <polygon points="100,100 145,75 145,125 100,150" fill="#172554" stroke="#2563eb" stroke-width="2" opacity="0.8"/>
    
    <!-- Coordinate Axis / Vectors (3D Field Forces) -->
    <line x1="100" y1="100" x2="100" y2="40" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
    <polygon points="100,34 96,44 104,44" fill="#38bdf8"/>
    
    <line x1="100" y1="100" x2="155" y2="132" stroke="#818cf8" stroke-width="3" stroke-linecap="round"/>
    <polygon points="160,135 150,135 154,127" fill="#818cf8"/>
    
    <line x1="100" y1="100" x2="45" y2="132" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>
    <polygon points="40,135 46,127 50,135" fill="#a855f7"/>
    
    <!-- Core Center Origin -->
    <circle cx="100" cy="100" r="4.5" fill="#ffffff"/>
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
* **Interactive Interaction:** Direct pointer interaction allows users to perturb fluid paths, inject momentum, and place virtual obstacles.
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
