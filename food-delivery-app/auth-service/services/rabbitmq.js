const amqp = require('amqplib');

// Connection and channel variables
let connection = null;
let channel = null;

// Connect to RabbitMQ
const connect = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Assert exchange
    await channel.assertExchange('user_events', 'topic', { durable: true });
    
    console.log('Connected to RabbitMQ');
    return channel;
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    // Implement retry mechanism if needed
    setTimeout(connect, 5000);
  }
};

// Publish message to RabbitMQ
const publishMessage = async (routingKey, message) => {
  try {
    if (!channel) {
      await connect();
    }
    
    await channel.publish(
      'user_events', 
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    return true;
  } catch (error) {
    console.error('Error publishing message to RabbitMQ:', error);
    channel = null;
    throw error;
  }
};

// Initialize connection
const initialize = async () => {
  await connect();
};

process.on('exit', () => {
  if (channel) channel.close();
  if (connection) connection.close();
});

module.exports = {
  initialize,
  publishMessage
}; 