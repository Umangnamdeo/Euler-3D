# Euler 3D

<p align="center">
  <img src="https://raw.githubusercontent.com/Umangnamdeo/Euler-3d/main/logo.png" alt="Euler 3D Logo" width="160" />
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
