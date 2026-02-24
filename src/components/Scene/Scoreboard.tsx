import { Text } from '@react-three/drei';
import { useMatchStore, formatAFLScore } from '../../store/matchStore';
import { FIELD_CONFIG } from '../../models/FieldModel';

export function Scoreboard() {
  const homeTeamName = useMatchStore((s) => s.homeTeamName);
  const awayTeamName = useMatchStore((s) => s.awayTeamName);
  const homeScore = useMatchStore((s) => s.homeScore);
  const awayScore = useMatchStore((s) => s.awayScore);
  const quarter = useMatchStore((s) => s.quarter);
  const showScoreboard = useMatchStore((s) => s.showScoreboard);

  // Only render when visible and at least one team name is set
  if (!showScoreboard || (!homeTeamName && !awayTeamName)) return null;

  const boardWidth = 24;
  const boardHeight = 8;
  const boardY = 14;
  const boardZ = -(FIELD_CONFIG.width / 2 + 10);

  return (
    <group position={[0, 0, boardZ]}>
      {/* Support posts */}
      <mesh position={[-boardWidth / 2 + 1, boardY / 2, 0]} castShadow>
        <boxGeometry args={[0.3, boardY, 0.3]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[boardWidth / 2 - 1, boardY / 2, 0]} castShadow>
        <boxGeometry args={[0.3, boardY, 0.3]} />
        <meshStandardMaterial color="#555555" />
      </mesh>

      {/* Scoreboard panel */}
      <mesh position={[0, boardY, 0]} castShadow>
        <boxGeometry args={[boardWidth, boardHeight, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Home team name */}
      <Text
        font="/fonts/Inter-Bold.woff"
        position={[-5, boardY + 2, 0.2]}
        fontSize={1.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={10}
      >
        {homeTeamName || 'Home'}
      </Text>

      {/* VS */}
      <Text
        font="/fonts/Inter-Bold.woff"
        position={[0, boardY + 2, 0.2]}
        fontSize={0.8}
        color="#aaaaaa"
        anchorX="center"
        anchorY="middle"
      >
        vs
      </Text>

      {/* Away team name */}
      <Text
        font="/fonts/Inter-Bold.woff"
        position={[5, boardY + 2, 0.2]}
        fontSize={1.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={10}
      >
        {awayTeamName || 'Away'}
      </Text>

      {/* Home score */}
      <Text
        font="/fonts/Inter-Bold.woff"
        position={[-5, boardY, 0.2]}
        fontSize={1.0}
        color="#FFD200"
        anchorX="center"
        anchorY="middle"
      >
        {formatAFLScore(homeScore)}
      </Text>

      {/* Away score */}
      <Text
        font="/fonts/Inter-Bold.woff"
        position={[5, boardY, 0.2]}
        fontSize={1.0}
        color="#FFD200"
        anchorX="center"
        anchorY="middle"
      >
        {formatAFLScore(awayScore)}
      </Text>

      {/* Quarter */}
      <Text
        font="/fonts/Inter-Bold.woff"
        position={[0, boardY - 1.5, 0.2]}
        fontSize={0.9}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
      >
        {quarter}
      </Text>
    </group>
  );
}
