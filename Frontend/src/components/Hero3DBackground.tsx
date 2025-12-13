'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Animated 3D Globe Component
function AnimatedGlobe() {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const particlesRef = useRef<THREE.Points>(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        // Rotate main globe
        if (meshRef.current) {
            meshRef.current.rotation.y = t * 0.15;
            meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
        }

        // Rotate glow
        if (glowRef.current) {
            glowRef.current.rotation.y = -t * 0.1;
        }

        // Animate particles
        if (particlesRef.current) {
            particlesRef.current.rotation.y = t * 0.05;
        }
    });

    // Create particles
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = 3 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        // Amber to blue colors
        colors[i3] = 0.98;     // R
        colors[i3 + 1] = 0.75; // G
        colors[i3 + 2] = 0.15; // B
    }

    return (
        <group>
            {/* Main Globe */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[1.5, 64, 64]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#f59e0b"
                    emissiveIntensity={0.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Glowing Wireframe */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[1.8, 32, 32]} />
                <meshBasicMaterial
                    color="#f59e0b"
                    wireframe
                    transparent
                    opacity={0.2}
                />
            </mesh>

            {/* Orbiting Ring 1 */}
            <mesh rotation={[Math.PI / 4, 0, 0]}>
                <torusGeometry args={[2.2, 0.02, 16, 100]} />
                <meshStandardMaterial
                    color="#f59e0b"
                    emissive="#f59e0b"
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Orbiting Ring 2 */}
            <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
                <torusGeometry args={[2.5, 0.015, 16, 100]} />
                <meshStandardMaterial
                    color="#0ea5e9"
                    emissive="#0ea5e9"
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* Particles */}
            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particleCount}
                        array={positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        count={particleCount}
                        array={colors}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.05}
                    vertexColors
                    transparent
                    opacity={0.6}
                    sizeAttenuation
                />
            </points>

            {/* Lighting */}
            <pointLight position={[3, 3, 3]} intensity={2} color="#fbbf24" />
            <pointLight position={[-3, -3, -3]} intensity={1} color="#0ea5e9" />
            <ambientLight intensity={0.4} />
        </group>
    );
}

// Main 3D Scene
export default function Hero3DBackground() {
    return (
        <div className="absolute inset-0 -z-10" style={{ height: '100vh', width: '100%' }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 60 }}
                style={{ background: 'transparent' }}
            >
                <color attach="background" args={['#0a0e1a']} />
                <fog attach="fog" args={['#0a0e1a', 5, 15]} />

                {/* Stars */}
                <Stars
                    radius={50}
                    depth={50}
                    count={2000}
                    factor={3}
                    saturation={0}
                    fade
                    speed={0.5}
                />

                {/* Main 3D Content */}
                <AnimatedGlobe />

                {/* Controls */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 1.6}
                    minPolarAngle={Math.PI / 2.4}
                />
            </Canvas>
        </div>
    );
}
