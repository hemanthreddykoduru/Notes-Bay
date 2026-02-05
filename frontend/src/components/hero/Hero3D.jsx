import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, ContactShadows, Environment, Text } from '@react-three/drei';

function FloatingShape({ position, color, speed }) {
    const mesh = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        mesh.current.rotation.x = Math.cos(t / 4 * speed) / 2;
        mesh.current.rotation.y = Math.sin(t / 4 * speed) / 2;
        mesh.current.rotation.z = Math.sin(t / 4 * speed) / 2;
        mesh.current.position.y = position[1] + Math.sin(t * 1.5 * speed) / 10;
    });

    return (
        <group position={position}>
            <mesh ref={mesh}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color={color} roughness={0.1} metalness={0.8} />
            </mesh>
        </group>
    );
}

function FloatingBook({ position, color, rotation, delay }) {
    const group = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime() + delay;
        group.current.position.y = position[1] + Math.sin(t) * 0.2;
        group.current.rotation.x = rotation[0] + Math.cos(t / 2) * 0.1;
        group.current.rotation.y = rotation[1] + Math.sin(t / 2) * 0.1;
    });

    return (
        <group ref={group} position={position} rotation={rotation}>
            {/* Book Cover */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.5, 2, 0.2]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Book Pages */}
            <mesh position={[0.1, 0, 0]}>
                <boxGeometry args={[1.4, 1.9, 0.18]} />
                <meshStandardMaterial color="white" />
            </mesh>
        </group>
    )
}

export default function Hero3D() {
    return (
        <div className="h-[400px] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={50} />
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1} />

                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <FloatingBook position={[-1.5, 0, 0]} rotation={[0, 0.5, 0.2]} color="#4f46e5" delay={0} />
                    <FloatingBook position={[1.5, 0.5, -1]} rotation={[0, -0.5, -0.2]} color="#ec4899" delay={1} />
                    <FloatingBook position={[0, -0.5, -2]} rotation={[0.5, 0, 0]} color="#14b8a6" delay={2} />
                </Float>

                <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
