import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows } from '@react-three/drei';

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

export default function LoginScene() {
    return (
        <Canvas>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#4f46e5" />

            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                {/* Floating Books for Login Scene */}
                <FloatingBook position={[0, -0.5, 0]} rotation={[0.2, 0.5, 0]} color="#6366f1" delay={0} />
                <FloatingBook position={[-1.8, -2.5, -1]} rotation={[0, -0.3, 0.2]} color="#818cf8" delay={1.5} />
                <FloatingBook position={[1.8, -2.7, -0.5]} rotation={[0.3, 0, -0.2]} color="#c084fc" delay={0.8} />
            </Float>

            <ContactShadows position={[0, -3, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
            <Environment preset="city" />
        </Canvas>
    );
}
