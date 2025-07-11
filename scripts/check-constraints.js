const { Pool } = require('pg');

async function checkConstraints() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'CHECK'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    console.log('Check constraints found:');
    result.rows.forEach(row => {
      console.log(`${row.table_name}.${row.constraint_name}: ${row.check_clause}`);
    });
    
    // Check for quantity/amount constraints
    const constraintClauses = result.rows.map(c => c.check_clause.toLowerCase());
    
    const hasQuantityConstraints = constraintClauses.some(clause => 
      clause.includes('quantity') && clause.includes('> 0')
    );
    
    const hasAmountConstraints = constraintClauses.some(clause => 
      clause.includes('amount') && clause.includes('> 0')
    );
    
    console.log('\nConstraint analysis:');
    console.log('Has quantity constraints:', hasQuantityConstraints);
    console.log('Has amount constraints:', hasAmountConstraints);
    console.log('Test would pass:', hasQuantityConstraints || hasAmountConstraints);
    
    client.release();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkConstraints();
