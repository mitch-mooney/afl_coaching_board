import React, { useState } from 'react';
import {
  drillLibrary,
  getCategoryCount,
} from '../../data/drillLibrary';
import type { Drill, DrillCategory } from '../../models/TrainingSession';

interface DrillLibraryProps {
  onSelectDrill: (drill: Drill) => void;
}

export const DrillLibrary: React.FC<DrillLibraryProps> = ({ onSelectDrill }) => {
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories: (DrillCategory | 'all')[] = [
    'all',
    'marking',
    'kicking',
    'ball-handling',
    'defence',
    'attack',
    'fitness',
    'goal-kicking',
    'rucking',
  ];

  const filteredDrills = drillLibrary.filter((drill) => {
    const matchesCategory =
      selectedCategory === 'all' || drill.category === selectedCategory;
    const matchesSearch =
      drill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drill.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Drill Library</h2>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search drills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            marginBottom: '16px',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '8px 16px',
              backgroundColor:
                selectedCategory === category ? '#2196f3' : '#f5f5f5',
              color: selectedCategory === category ? 'white' : '#333',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: selectedCategory === category ? 'bold' : 'normal',
            }}
          >
            {category === 'all'
              ? 'All Drills'
              : category.charAt(0).toUpperCase() + category.slice(1)}
            {category !== 'all' && (
              <span
                style={{
                  marginLeft: '4px',
                  fontSize: '12px',
                  opacity: 0.8,
                }}
              >
                ({getCategoryCount(category)})
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {filteredDrills.map((drill) => (
          <div
            key={drill.id}
            onClick={() => onSelectDrill(drill)}
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                }}
              >
                {drill.name}
              </h3>
              <span
                style={{
                  padding: '4px 8px',
                  backgroundColor: getCategoryColor(drill.category),
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {drill.category}
              </span>
            </div>

            {drill.durationSeconds && (
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '8px',
                }}
              >
                <strong>Duration:</strong> {Math.floor(drill.durationSeconds / 60)} min
              </div>
            )}

            {drill.playersRequired && (
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '8px',
                }}
              >
                <strong>Players:</strong> {drill.playersRequired}
              </div>
            )}

            {drill.description && (
              <p
                style={{
                  fontSize: '14px',
                  color: '#666',
                  margin: '8px 0 0 0',
                  lineHeight: '1.5',
                }}
              >
                {drill.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {filteredDrills.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666',
          }}
        >
          No drills found matching your criteria.
        </div>
      )}
    </div>
  );
};

const getCategoryColor = (category: DrillCategory): string => {
  const colors: Record<DrillCategory, string> = {
    marking: '#4caf50',
    kicking: '#2196f3',
    'ball-handling': '#ff9800',
    defence: '#f44336',
    attack: '#9c27b0',
    fitness: '#ff5722',
    'goal-kicking': '#00bcd4',
    rucking: '#795548',
  };
  return colors[category];
};
