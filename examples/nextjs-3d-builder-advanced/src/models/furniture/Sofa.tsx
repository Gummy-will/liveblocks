import React, { ComponentProps, forwardRef, Ref } from "react";
import { useGLTF } from "@react-three/drei";
import { FurnitureModels } from "./types";
import { Group } from "three";

export const Sofa = forwardRef(
  (props: ComponentProps<"group">, ref: Ref<Group>) => {
    const { nodes, materials } = useGLTF("/furniture.glb") as FurnitureModels;

    return (
      <group {...props} ref={ref} dispose={null}>
        <group position={[0, 0.392, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.sofa_1.geometry}
            material={materials.sofaFabric}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.sofa_2.geometry}
            material={materials.sofaWood}
          />
        </group>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.sofaPillow.geometry}
          material={materials.sofaFabric}
          position={[-0.453, 0.71, 0.138]}
          rotation={[Math.PI / 2, 0, 0.114]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.sofaPillowLong.geometry}
          material={materials.sofaFabric}
          position={[0.293, 0.71, 0.144]}
          rotation={[Math.PI / 2, 0, -0.049]}
        />
      </group>
    );
  }
);

useGLTF.preload("/furniture.glb");
