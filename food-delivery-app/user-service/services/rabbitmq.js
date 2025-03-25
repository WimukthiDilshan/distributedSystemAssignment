const amqp = require('amqplib');
const UserController = require('../controllers/user');

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
    
    // Assert queue
    const q = await channel.assertQueue('user_service_queue', { durable: true });
    
    // Bind queue to exchange with routing key for user.created events
    await channel.bindQueue(q.queue, 'user_events', 'user.created');
    
    // Set up consumer
    channel.consume(q.queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log('Received message:', content);
          
          // Handle user created event
          if (msg.fields.routingKey === 'user.created') {
            await UserController.handleUserCreated(content);
          }
          
          // Acknowledge message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Reject and requeue if we can't process the message
          channel.nack(msg, false, true);
        }
      }
    });
    
    console.log('Connected to RabbitMQ');
    return channel;
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    // Implement retry mechanism
    setTimeout(connect, 5000);
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
  initialize
}; 