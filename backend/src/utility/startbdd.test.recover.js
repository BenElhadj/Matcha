// Vérifie si une table existe et si toutes les colonnes attendues sont présentes
const ensureTableStructure = async (tableName, expectedColumns, createTableQuery, insertSampleDataFn, resetSequenceFn) => {
  // Vérifier si la table existe
  const tableCheck = await pool.query(`SELECT to_regclass('public.${tableName}') as exists;`);
  if (tableCheck.rows[0].exists) {
    // Vérifier les colonnes existantes
    const columnsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${tableName}';`);
    const existingColumns = columnsRes.rows.map(r => r.column_name);
    const missing = expectedColumns.filter(col => !existingColumns.includes(col));
    if (missing.length > 0) {
      console.log(`La table ${tableName} existe mais il manque les colonnes : ${missing.join(', ')}. Suppression...`);
      await pool.query(`DROP TABLE ${tableName} CASCADE;`);
    }
  }
  // Création de la table si absente ou supprimée
  await pool.query(createTableQuery);
  // Remplissage si vide
  const countQuery = `SELECT COUNT(*) AS count FROM ${tableName}`;
  const countResult = await pool.query(countQuery);
  const rowCount = parseInt(countResult.rows[0].count);
  if (rowCount === 0 && insertSampleDataFn) {
    await insertSampleDataFn();
    if (resetSequenceFn) await resetSequenceFn();
  }
};
require('dotenv').config();
const { Pool } = require('pg')

const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.DB_TYPE === 'postgres'

let pool
if (USE_POSTGRES) {
  const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }

  pool = new Pool(config)

  pool.on('connect', () => {
    console.log('✅ PostgreSQL DB is connected')
  })

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err)
  })
} else {
  console.log('ℹ️ Skipping PostgreSQL initialization (USE_POSTGRES not set).')
  pool = {
    query: async () => {
      throw new Error('PostgreSQL is disabled. Set USE_POSTGRES=true in backend/.env to enable PostgreSQL functionality.')
    }
  }
}

// Fonction utilitaire pour reset les séquences
const resetSequence = async (tableName, idColumn = 'id') => {
  try {
    const sequenceName = `${tableName}_${idColumn}_seq`;
    const resetQuery = `SELECT setval('${sequenceName}', (SELECT MAX(${idColumn}) FROM ${tableName}), true);`;
    await pool.query(resetQuery);
    console.log(`✅ Sequence ${sequenceName} reset`);
  } catch (error) {
    console.error(`Error resetting sequence for ${tableName}:`, error);
  }
};

const createUserTable = async () => {
  try {
    console.log('🔄 Creating UserTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) DEFAULT NULL,
        last_name VARCHAR(255) DEFAULT NULL,
        username VARCHAR(25) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        gender VARCHAR(20) DEFAULT NULL,
        looking VARCHAR(20) DEFAULT NULL,
        birthdate DATE DEFAULT NULL,
        biography VARCHAR(510) DEFAULT NULL,
        tags VARCHAR(550) DEFAULT NULL,
        address VARCHAR(255) DEFAULT NULL,
        city VARCHAR(255) DEFAULT NULL,
        country VARCHAR(255) DEFAULT NULL,
        postal_code VARCHAR(50) DEFAULT NULL,
        phone VARCHAR(255) DEFAULT NULL,
        status TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lat VARCHAR(30) NOT NULL DEFAULT '0',
        lng VARCHAR(30) NOT NULL DEFAULT '0',
        vkey VARCHAR(255) NOT NULL DEFAULT '',
        rkey VARCHAR(255) DEFAULT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        google_id VARCHAR(50) DEFAULT NULL,
        reports INTEGER DEFAULT 0
      );
    `;
    await pool.query(createTableQuery);
    console.log('Users table created successfully!');

    const expectedColumns = [
      'id','first_name','last_name','username','email','password','created_at','gender','looking','birthdate','biography','tags','address','city','country','postal_code','phone','status','lat','lng','vkey','rkey','verified','google_id','reports'
    ];
    const insertSampleData = async () => {
      const insertTableQuery = `
        INSERT INTO users (first_name, last_name, username, email, password, created_at, gender, looking, birthdate, biography, tags, address, city, country, postal_code, phone, status, lat, lng, vkey, rkey, verified, google_id, reports) VALUES
        ('Test', 'Admin', 'AdminTest', '42projetsweb@gmail.com', '$2a$10$LG21UOau1qzQ9nCIWNq7iuAltnSsgoPCWHFl5H33PsBRqs0ghyUZK', '2023-07-07 03:09:20', 'male', 'all', '1990-04-09', 'je suis timide', 'Music, Cinema, Geek, Development, Sports', '5 Passage Bullourde', 'Paris', 'France', '75011', '0605868051', '2023-07-07 03:09:20', '48.841463', '2.3614006', '', '', true, '', 0),
        ('Hamdi', 'ELHADJ', 'TestAdmin', '42bhamdi@gmail.com', '$2a$10$UdgzWKD3wKGQWMGK.UWdK.dM53o1wmq/XZGXD46ihtJRaMBOf5ZIa', '2023-07-07 03:10:08', 'male', 'all', '1985-02-05', 'je n ai rien a dire', 'Sports, Geek, Music, Cinema, Development,', '107 rue de Charenton', 'Paris', 'France', '75012', '0605868051', '2023-07-07 03:10:08', '48.8414475', '2.3614038', '', '', true, '', '0'),
        ('Jayda', 'Feil', 'Stanley95', 'Stanley95@matcha.com', '$2a$10$PEm2yMBHw0gkCg6t7rdDn.v6qZC.BPPSVaG1mgc9tSzjMCstmJnFi', '2023-07-04 08:59:10', 'male', 'female', '2001-03-03', 'Ici pour vous faire rever, je suis naturel naturelle et je cherche une personne naturelle et simple et qui aime la vie, Perdu mais aimant', 'Front-end, Vegan, Back-end, Development', '56 AVENUE DE SAINT-CLOUD', 'Versailles', 'France', '78000', '0864804386', '2023-07-04 08:59:10', '48.805241', '2.138634', '', '', true, '', '0'),
        ('Ahmad', 'Grady', 'Cleveland1', 'Cleveland1@matcha.com', '$2a$10$PEm2yMBHw0gkCg6t7rdDn.v6qZC.BPPSVaG1mgc9tSzjMCstmJnFi', '2023-04-24 05:21:36', 'male', 'male', '2004-09-23', 'je cherche des amis et des amies pour sortir et plus si affinites, Perdu mais aimant, je cherche l amour', 'RNCP-7, Front-end, Back-end, Sports', '5 RUE CARNOT', 'Versailles', 'France', '78000', '0972723295', '2023-04-24 05:21:36', '48.806523', '2.126378', '', '', true, '', '0'),
        ('Marguerite', 'Will', 'LemuelOConner', 'LemuelOConner@matcha.com', '$2a$10$PEm2yMBHw0gkCg6t7rdDn.v6qZC.BPPSVaG1mgc9tSzjMCstmJnFi', '2023-06-15 17:07:11', 'female', 'male', '1998-01-29', 'je suis calme et casaniere, je vous attends avec impatience, je suis franc', 'Validate-at-125, Front-end, Piercing, Geek', '2 ESPLANADE GRAND SIECLE', 'Versailles', 'France', '78000', '0567050968', '2023-06-15 17:07:11', '48.81245', '2.096023', '', '', true, '', 0);
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into users table');
    };
    await ensureTableStructure('users', expectedColumns, createTableQuery, insertSampleData, async () => await resetSequence('users', 'id'));
    const countQuery = 'SELECT COUNT(*) AS count FROM users';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`Users table currently has ${rowCount} rows`);
    if (rowCount === 0) {
      console.log('Users table was empty and has been filled with sample data.');
    } else {
      console.log('Users table already contains data.');
    }
    console.log('✅ Users table created\n');
  } catch (error) {
    console.error('Error creating user table:', error);
    throw error;
  }
};


const createBlockedTable = async () => {
  try {
    console.log('🔄 Creating BlockedTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS blocked(
        id SERIAL PRIMARY KEY,
        blocker INTEGER NOT NULL,
        blocked INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        type VARCHAR(16) NOT NULL DEFAULT 'block'
      );
    `;
    await pool.query(createTableQuery);
    console.log('Blocked table created successfully!');

    const expectedColumns = ['id','blocker','blocked','created_at','type'];
    const insertSampleData = async () => {
      const insertTableQuery = `
        INSERT INTO blocked (blocker, blocked, created_at, type) VALUES
        (1, 214, '2023-05-04 16:56:13', 'block'),
        (2, 65, '2023-05-04 16:56:13', 'block'),
        (1, 55, '2023-05-04 16:56:13', 'block'),
        (3, 41, '2023-05-04 16:56:13', 'block'),
        (384, 6, '2023-05-04 16:56:13', 'block'),
        (36, 5, '2023-05-04 16:56:13', 'block'),
        (77, 275, '2023-05-04 16:56:13', 'block'),
        (395, 8, '2023-05-04 16:56:13', 'block'),
        (1, 55, '2023-05-04 16:56:13', 'block'),
        (3, 41, '2023-05-04 16:56:13', 'report'),
        (1, 44, '2023-05-04 16:56:13', 'report'),
        (304, 1, '2023-05-04 16:56:13', 'report'),
        (1, 85, '2023-05-04 16:56:13', 'block'),
        (465, 1, '2023-05-04 16:56:13', 'report'),
        (1, 56, '2023-05-04 16:56:13', 'report'),
        (76, 1, '2023-05-04 16:56:13', 'report'),
        (1, 77, '2023-05-04 16:56:13', 'report'),
        (97, 1, '2023-05-04 16:56:13', 'report'),
        (1, 88, '2023-05-04 16:56:13', 'report'),
        (108, 1, '2023-05-04 16:56:13', 'block'),
        (2, 30, '2023-05-04 16:56:13', 'block'),
        (3, 247, '2023-05-04 16:56:13', 'report'),
        (2, 41, '2023-05-04 16:56:13', 'report'),
        (4, 2, '2023-05-04 16:56:13', 'report'),
        (2, 352, '2023-05-04 16:56:13', 'report'),
        (185, 2, '2023-05-04 16:56:13', 'report'),
        (298, 5, '2023-05-04 16:56:13', 'block');
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into blocked table');
    };
    await ensureTableStructure('blocked', expectedColumns, createTableQuery, insertSampleData, async () => await resetSequence('blocked', 'id'));
    const countQuery = 'SELECT COUNT(*) AS count FROM blocked';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`Blocked table currently has ${rowCount} rows`);
    if (rowCount === 0) {
      console.log('Blocked table was empty and has been filled with sample data.');
    } else {
      console.log('Blocked table already contains data.');
    }
    console.log('✅ Blocked table created\n');
  } catch (error) {
    console.error('Error creating blocked table:', error);
  }
};

const createChatTable = async () => {
  try {
    console.log('🔄 Creating ChatTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS chat (
        id SERIAL PRIMARY KEY,
        id_conversation INTEGER NOT NULL,
        id_from INTEGER NOT NULL,
        message VARCHAR(2048) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN NOT NULL DEFAULT false
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('Chat table created successfully!');
    
    const countQuery = 'SELECT COUNT(*) AS count FROM chat';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    
    console.log(`Chat table currently has ${rowCount} rows`);

    if (rowCount === 0) {
      console.log('Inserting sample data into chat table...');
      const insertTableQuery = `
        INSERT INTO chat (id_conversation, id_from, message, created_at, is_read) VALUES  
        (2, 1, 'Salut', '2020-06-15 17:07:11', false),
        (1, 2, 'Salut', '2020-06-15 17:07:11', false),
        (1, 3, 'Ca va ?', '2020-06-15 17:07:11', false),
        (1, 2, 'Ca va et toi ?', '2020-06-15 17:07:11', false),
        (1, 2, 'Ca va bien merci', '2020-06-15 17:07:11', false),
        (1, 2, 'Tu fais quoi ?', '2020-06-15 17:07:11', false),
        (2, 1, 'Je suis en train de coder', '2020-06-15 17:07:11', false),
        (1, 2, 'Ok', '2020-06-15 17:07:11', false),
        (2, 1, 'Et toi ?', '2020-06-15 17:07:11', false),
        (1, 2, 'Je suis en train de coder', '2020-06-15 17:07:11', false),
        (11, 51, 'Ok', '2020-06-15 17:07:11', false),
        (1, 11, 'im here', '2023-10-21 02:55:44', true),
        (151, 1, 'hello', '2023-10-21 02:55:47', true),
        (1, 2, 'yo', '2023-10-21 02:56:27', true),
        (1, 2, 'how are you', '2023-10-21 02:56:33', true),
        (2, 475, 'hjdfgvpbh', '2023-10-21 03:04:37', true),
        (2, 475, 'comment vas tu', '2023-10-21 03:04:45', true),
        (4, 475, 'cc', '2023-10-21 05:12:06', true),
        (4, 475, 'qu est ce que tu deviens', '2023-10-21 05:12:21', true),
        (5, 323, 'hi man', '2023-10-21 05:14:00', true),
        (6, 1, 'you are welcome', '2023-10-21 05:20:01', false),
        (7, 16, 'mar7be bik', '2023-10-21 05:21:27', true),
        (8, 410, '3aslema', '2023-10-21 05:22:34', true),
        (9, 140, 'winek', '2023-10-21 05:24:00', true),
        (11, 23, 'ya rajel chnawa a7welik', '2023-10-21 05:28:17', true),
        (11, 1, 'walahi matcha habletni', '2023-10-21 05:28:39', false),
        (12, 8, 'bonjourno amogo', '2023-10-21 05:29:52', true),
        (12, 8, 'come stai', '2023-10-21 05:30:27', true),
        (13, 12, 'je t es chercher partout', '2023-10-21 05:32:16', true),
        (14, 18, 'hey tu es toujours vivant', '2023-10-21 05:37:55', true),
        (15, 29, 'mon gars tu me soul avec ton projet', '2023-10-21 05:40:11', true),
        (16, 216, 'prend ton sac a dos et casse toi', '2023-10-21 05:42:07', true),
        (17, 22, 'vivement la fin du projet', '2023-10-21 05:43:51', true),
        (18, 426, 'la vie ne s arrête pas pour les problemes d aucun personne', '2023-10-21 05:46:05', true),
        (19, 1, 'bientot je serai libre in che2 allah', '2023-10-21 05:47:22', false),
        (20, 19, 'je suis fatigue', '2023-10-21 05:49:40', false),
        (20, 19, 'ces projets me soul comme jamais', '2023-10-21 05:50:04', true),
        (1, 2, 'bjr', '2023-10-22 00:26:36', false),
        (15, 29, 'salut', '2023-10-22 06:39:04', false),
        (15, 29, 'tu ne repond pas', '2023-10-22 06:53:11', true),
        (1, 50, 'cc mon gars', '2023-10-22 06:53:59', false),
        (54, 1, 'ça vas?', '2023-10-22 06:54:05', false),
        (12, 1, 'OK comme tu veux', '2023-10-24 19:36:33', false);
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into chat table');
      
      await resetSequence('chat', 'id');
    } else {
      console.log('Chat table already contains data.');
    }
    console.log('✅ Chat table created\n');
  } catch (error) {
    console.error('Error creating chat table:', error);
  }
};


const createConversationsTable = async () => {
  try {
    console.log('🔄 Creating ConversationsTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS conversations (
        id_conversation SERIAL PRIMARY KEY,
        id_user1 INTEGER NOT NULL,
        id_user2 INTEGER NOT NULL,
        last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        allowed BOOLEAN NOT NULL DEFAULT true,
        last_msg INTEGER DEFAULT NULL
      );
    `;
    await pool.query(createTableQuery);
    console.log('Conversations table created successfully!');
    const countQuery = 'SELECT COUNT(*) AS count FROM conversations';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`Conversations table currently has ${rowCount} rows`);
    if (rowCount === 0) {
      console.log('Inserting sample data into conversations table...');
      const insertTableQuery = `
        INSERT INTO conversations (id_user1, id_user2, last_update, allowed, last_msg) VALUES
        (2, 1, '2023-10-22 06:54:05', true, NULL),
        (2, 475, '2023-10-21 03:04:45', true, NULL),
        (3, 1, '2023-10-21 03:10:41', true, NULL),
        (4, 1, '2023-10-21 05:12:21', true, NULL),
        (5, 1, '2023-10-21 05:14:00', true, NULL),
        (6, 1, '2023-10-21 05:20:01', true, NULL),
        (7, 1, '2023-10-21 05:21:27', true, NULL),
        (8, 1, '2023-10-21 05:22:34', true, NULL),
        (9, 1, '2023-10-21 05:24:00', true, NULL),
        (10, 1, '2023-10-21 03:27:48', true, NULL),
        (11, 23, '2023-10-21 05:28:39', true, NULL),
        (12, 1, '2023-10-24 19:36:33', true, NULL),
        (13, 1, '2023-10-21 05:32:16', true, NULL),
        (14, 1, '2023-10-21 05:37:55', true, NULL),
        (15, 1, '2023-10-22 06:53:11', true, NULL),
        (16, 1, '2023-10-21 05:42:07', true, NULL),
        (17, 1, '2023-10-21 05:43:51', true, NULL),
        (18, 1, '2023-10-21 05:46:05', true, NULL),
        (19, 1, '2023-10-21 05:47:22', true, NULL),
        (20, 1, '2023-10-21 05:50:04', true, NULL),
        (21, 4, '2023-10-21 04:03:58', true, NULL),
        (22, 1, '2023-10-22 19:36:14', true, NULL),
        (1, 299, '2023-10-24 23:36:49', true, NULL);
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into conversations table');
      await resetSequence('conversations', 'id_conversation');
    } else {
      console.log('Conversations table already contains data.');
    }
    console.log('✅ Conversations table created\n');
  } catch (error) {
    console.error('Error creating conversations table:', error);
  }
};

const createHistoryTable = async () => {
  try {
    console.log('🔄 Creating HistoryTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS history (
        id SERIAL PRIMARY KEY,
        visitor INTEGER NOT NULL,
        visited INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        type VARCHAR(20) NOT NULL DEFAULT 'visit'
      );
    `;
    await pool.query(createTableQuery);
    console.log('History table created successfully!');

    const expectedColumns = ['id','visitor','visited','created_at','type'];
    const insertSampleData = async () => {
      const insertTableQuery = `
        INSERT INTO history (visitor, visited, created_at, type) VALUES
        (1, 67, '2023-08-02 01:59:53'),
        (23, 1, '2023-08-03 02:18:46'),
        (1, 61, '2023-08-03 02:25:00'),
        (19, 126, '2023-10-28 08:03:17'),
        (19, 126, '2023-10-28 08:04:50'),
        (19, 126, '2023-10-28 08:40:17');
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into history table');
    };
    await ensureTableStructure('history', expectedColumns, createTableQuery, insertSampleData, async () => await resetSequence('history', 'id'));
    const countQuery = 'SELECT COUNT(*) AS count FROM history';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`History table currently has ${rowCount} rows`);
    if (rowCount === 0) {
      console.log('History table was empty and has been filled with sample data.');
    } else {
      console.log('History table already contains data.');
    }
    console.log('✅ History table created\n');
  } catch (error) {
    console.error('Error creating history table:', error);
  }
};

const createImagesTable = async () => {
  try {
    console.log('🔄 Creating ImagesTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        link TEXT NOT NULL,
        data TEXT,
        profile BOOLEAN NOT NULL DEFAULT false,
        cover BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('Images table created successfully!');
    const expectedColumns = ['id','user_id','link','data','profile','cover','created_at'];
    const insertSampleData = async () => {
      const insertTableQuery = `
        INSERT INTO images (user_id, link, data, profile, cover, created_at) VALUES
        (495, 'https://i.pravatar.cc/1584x396?u=user-2478', false, false, true, '2023-05-15 06:48:05'),
        (495, 'https://i.pravatar.cc/400?u=user-2479', false, true, false, '2023-04-15 02:35:28'),
        (495, 'https://i.pravatar.cc/400?u=user-2480', false, false, false, '2023-04-29 08:15:04'),
        (495, 'https://i.pravatar.cc/400?u=user-2481', false, false, false, '2023-04-17 12:49:21'),
        (495, 'https://i.pravatar.cc/400?u=user-2482', false, false, false, '2022-12-26 22:41:46'),
        (496, 'https://i.pravatar.cc/1584x396?u=user-2483', false, false, true, '2023-05-03 14:37:52'),
        (496, 'https://i.pravatar.cc/400?u=user-2484', false, true, false, '2023-04-19 06:03:56'),
        (496, 'https://i.pravatar.cc/400?u=user-2485', false, false, false, '2023-10-05 04:30:15'),
        (496, 'https://i.pravatar.cc/400?u=user-2486', false, false, false, '2023-06-12 11:45:07'),
        (496, 'https://i.pravatar.cc/400?u=user-2487', false, false, false, '2023-07-06 22:06:26'),
        (497, 'https://i.pravatar.cc/1584x396?u=user-2488', false, false, true, '2023-01-14 19:56:06'),
        (497, 'https://i.pravatar.cc/400?u=user-2489', false, true, false, '2023-10-02 06:26:54'),
        (497, 'https://i.pravatar.cc/400?u=user-2490', false, false, false, '2023-04-09 16:51:38'),
        (497, 'https://i.pravatar.cc/400?u=user-2491', false, false, false, '2023-10-23 13:46:47'),
        (497, 'https://i.pravatar.cc/400?u=user-2492', false, false, false, '2023-06-21 20:18:53'),
        (498, 'https://i.pravatar.cc/1584x396?u=user-2493', false, false, true, '2023-05-06 04:40:26'),
        (498, 'https://i.pravatar.cc/400?u=user-2494', false, true, false, '2023-09-05 10:34:50'),
        (498, 'https://i.pravatar.cc/400?u=user-2495', false, false, false, '2023-02-13 02:03:54'),
        (498, 'https://i.pravatar.cc/400?u=user-2496', false, false, false, '2023-04-23 05:14:01'),
        (498, 'https://i.pravatar.cc/400?u=user-2497', false, false, false, '2023-09-03 15:48:01'),
        (499, 'https://i.pravatar.cc/1584x396?u=user-2498', false, false, true, '2023-07-31 12:42:55'),
        (499, 'https://i.pravatar.cc/400?u=user-2499', false, true, false, '2022-11-16 21:18:33'),
        (499, 'https://i.pravatar.cc/400?u=user-2500', false, false, false, '2022-12-14 17:38:42'),
        (499, 'https://i.pravatar.cc/400?u=user-2501', false, false, false, '2022-11-29 11:33:48'),
        (499, 'https://i.pravatar.cc/400?u=user-2502', false, false, false, '2023-09-05 11:23:41'),
        (500, 'https://i.pravatar.cc/1584x396?u=user-2503', false, false, true, '2023-01-20 16:04:25'),
        (500, 'https://i.pravatar.cc/400?u=user-2504', false, true, false, '2023-06-07 20:40:39'),
        (500, 'https://i.pravatar.cc/400?u=user-2505', false, false, false, '2023-10-11 20:14:02'),
        (500, 'https://i.pravatar.cc/400?u=user-2506', false, false, false, '2023-07-04 07:20:51'),
        (500, 'https://i.pravatar.cc/400?u=user-2507', false, false, false, '2023-08-29 08:32:36');
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into images table');
    };
    await ensureTableStructure('images', expectedColumns, createTableQuery, insertSampleData, async () => await resetSequence('images', 'id'));
    const countQuery = 'SELECT COUNT(*) AS count FROM images';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`Images table currently has ${rowCount} rows`);
    if (rowCount === 0) {
      console.log('Images table was empty and has been filled with sample data.');
    } else {
      console.log('Images table already contains data.');
    }
    console.log('✅ Images table created\n');
  } catch (error) {
    console.error('Error creating Images table:', error);
  }
};

const createMatchesTable = async () => {
  try {
    console.log('🔄 Creating MatchesTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        matcher INTEGER NOT NULL,
        matched INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('Matches table created successfully!');

    const expectedColumns = ['id','matcher','matched','created_at'];
    const insertSampleData = async () => {
      const insertTableQuery = `
        INSERT INTO matches (matcher, matched, created_at) VALUES
        (1, 61, '2023-08-03 15:50:33'),
        (1, 43, '2023-10-22 19:36:14'),
        (126, 1, '2023-10-23 01:59:47'),
        (1, 299, '2023-10-24 23:36:49'),
        (1, 5, '2023-10-25 04:35:53');
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into matches table');
    };
    await ensureTableStructure('matches', expectedColumns, createTableQuery, insertSampleData, async () => await resetSequence('matches', 'id'));
    const countQuery = 'SELECT COUNT(*) AS count FROM matches';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`Matches table currently has ${rowCount} rows`);
    if (rowCount === 0) {
      console.log('Matches table was empty and has been filled with sample data.');
    } else {
      console.log('Matches table already contains data.');
    }
    console.log('✅ Matches table created\n');
  } catch (error) {
    console.error('Error creating matches table:', error);
  }
};

const createNotificationsTable = async () => {
  try {
    console.log('🔄 Creating NotificationsTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        id_from INTEGER NOT NULL,
        id_to INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN NOT NULL DEFAULT false,
        id_conversation INTEGER NOT NULL DEFAULT -1
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('Notifications table created successfully!');
    
    const countQuery = 'SELECT COUNT(*) AS count FROM notifications';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    
    console.log(`Notifications table currently has ${rowCount} rows`);

    if (rowCount === 0) {
      console.log('Inserting sample data into notifications table...');
      const insertTableQuery = `
        INSERT INTO notifications (type, id_from, id_to, created_at, is_read, id_conversation) VALUES
        ('visit', 1, 67, '2023-08-02 01:59:53', false, -1),
        ('like', 1, 74, '2023-08-03 04:05:36', false, -1),
        ('unlike', 1, 74, '2023-08-03 04:05:37', false, -1),
        ('visit', 2, 94, '2023-08-03 15:48:10', false, -1),
        ('like', 1, 61, '2023-08-03 15:50:33', false, -1),
        ('visit', 2, 1, '2023-08-03 16:18:52', true, -1),
        ('like', 2, 1, '2023-08-03 16:18:54', true, -1),
        ('like_back', 1, 5, '2023-08-03 16:19:40', true, -1),
        ('visit', 1, 5, '2023-08-03 16:21:46', true, -1),
        ('unlike', 1, 5, '2023-08-03 16:21:48', true, -1),
        ('like', 1, 5, '2023-08-03 16:21:48', true, -1),
        ('like_back', 2, 1, '2023-08-03 16:22:58', true, -1),
        ('visit', 19, 126, '2023-10-28 08:00:54', false, -1),
        ('visit', 19, 126, '2023-10-28 08:40:17', false, -1);
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into notifications table');
      
      await resetSequence('notifications', 'id');
    } else {
      console.log('Notifications table already contains data.');
    }
    console.log('✅ Notifications table created\n');
  } catch (error) {
    console.error('Error creating Notifications table:', error);
  }
};

const createTagsTable = async () => {
  try {
    console.log('🔄 Creating TagsTable...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        value VARCHAR(100) UNIQUE
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('Tags table created successfully!');
    
    const countQuery = 'SELECT COUNT(*) AS count FROM tags';
    const countResult = await pool.query(countQuery);
    const rowCount = parseInt(countResult.rows[0].count);
    
    console.log(`Tags table currently has ${rowCount} rows`);

    if (rowCount === 0) {
      console.log('Inserting sample data into tags table...');
      const insertTableQuery = `
        INSERT INTO tags (value) VALUES
        ('125'),
        ('42'),
        ('Back-end'),
        ('Cinema'),
        ('Football'),
        ('Gaming'),
        ('Tae-kwon-do'),
        ('Front-end'),
        ('Geek'),
        ('Music'),
        ('RNCP-5'),
        ('RNCP-7'),
        ('Sports'),
        ('Tattoos'),
        ('Vegan'),
        ('Web'),
        ('Web-Design'),
        ('Web-Development'),
        ('Web-Integration'),
        ('Web-UI-UX'),
        ('Webmaster');
      `;
      await pool.query(insertTableQuery);
      console.log('Sample data inserted into tags table');
      
      await resetSequence('tags', 'id');
    } else {
      console.log('Tags table already contains data.');
    }
    console.log('✅ Tags table created\n');
  } catch (error) {
    console.error('Error creating tags table:', error);
  }
};

const procedures = async () => {
  try {
    console.log('🔄 Creating functions...');
    
    // Drop existing functions if they exist
    await pool.query('DROP FUNCTION IF EXISTS calc_rating(INTEGER, OUT INTEGER, OUT INTEGER, OUT INTEGER) CASCADE');
    console.log('Dropped existing calc_rating function if it existed.');
    await pool.query('DROP FUNCTION IF EXISTS get_rating(INTEGER) CASCADE');
    console.log('Dropped existing get_rating function if it existed.');
  
    // Create CALC_RATING function (equivalent to the stored procedure)
    const createFunctionQuery1 = `
      CREATE OR REPLACE FUNCTION calc_rating(
        IN id_user INTEGER,
        OUT visites INTEGER,
        OUT likesCount INTEGER,
        OUT reported INTEGER
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
          SELECT COUNT(*) INTO likesCount
          FROM matches
          WHERE matched = id_user;
          
          SELECT COUNT(*) INTO visites
          FROM history
          WHERE visited = id_user;
          
          SELECT COALESCE(reports, 0) INTO reported
          FROM users
          WHERE id = id_user;
      END;
      $$;
    `;

    // Create GET_RATING function
    const createFunctionQuery2 = `
      CREATE OR REPLACE FUNCTION get_rating(id_user INTEGER)
      RETURNS DOUBLE PRECISION
      LANGUAGE plpgsql
      AS $$
      DECLARE
          visit INTEGER;
          likes INTEGER;
          reports INTEGER;
      BEGIN
          SELECT * INTO visit, likes, reports FROM calc_rating(id_user);
          RETURN sqrt(GREATEST(likes / 20.0 + visit / 100.0 - reports / 250.0, 0));
      END;
      $$;
    `;


    await pool.query(createFunctionQuery1);
    console.log('Created calc_rating function successfully.');
    await pool.query(createFunctionQuery2);
    console.log('Created get_rating function successfully.');
    
    console.log('✅ Functions created successfully!\n');
  } catch (error) {
    console.error('Error creating functions:', error);
  }
}

// Initialize all tables
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
  await createUserTable();
  await createImagesTable();
  await createBlockedTable();
  await createConversationsTable();
  await createHistoryTable();
  await createChatTable();
  await createMatchesTable();
  await createNotificationsTable();
  await createTagsTable();
  await procedures();
    console.log('✅ All database tables initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Call initialization only when PostgreSQL is explicitly enabled
if (USE_POSTGRES) {
  initializeDatabase();
} else {
  console.log('ℹ️ PostgreSQL initialization skipped because USE_POSTGRES is not enabled.');
}

// Export the pool and functions
module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  createUserTable,
  createImagesTable,
  createBlockedTable,
  createConversationsTable,
  createHistoryTable,
  createChatTable,
  createMatchesTable,
  createNotificationsTable,
  createTagsTable,
  procedures,
  initializeDatabase
};