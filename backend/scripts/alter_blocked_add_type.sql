-- Ajoute une colonne 'type' à la table blocked pour différencier block/report
ALTER TABLE blocked
ADD COLUMN type VARCHAR(16) NOT NULL DEFAULT 'block';

-- Index pour accélérer les requêtes par type
CREATE INDEX IF NOT EXISTS idx_blocked_type ON blocked (type);