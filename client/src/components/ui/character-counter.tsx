interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export default function CharacterCounter({ current, max, className = "" }: CharacterCounterProps) {
  const isNearLimit = current > max * 0.8;
  const isOverLimit = current > max;
  
  return (
    <span 
      className={`character-count text-xs ${
        isOverLimit ? 'text-destructive' : 
        isNearLimit ? 'text-yellow-500' : 
        'text-muted-foreground'
      } ${className}`}
      data-testid="character-counter"
    >
      {current}/{max}
    </span>
  );
}
