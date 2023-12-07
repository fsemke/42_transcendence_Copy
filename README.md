# 42_transcendence
## It's a Website with private chat channels and a pingpong game 
In this project we created a website with Angular, Nestjs and PostgreSQL in a docker-compose environment.<br>
## Login
We signin over a 42Intra-API but we also included a Bypass for testing purpose.<br>
![login](https://github.com/fsemke/42_transcendence_Copy/blob/master/readme/Screenshot%202023-12-07%20140740.png?raw=true)

### How to use the bypass
Use the following link to create/use a user with the userid 10:
{DOMAIN}/login?code={FOR_REAL_NO_BYPASS}&id=10
Change the id, if you want to use multiple testusers.

## Homescreen
Here you have a sneak peak of the top 3 players, ongoing games you can watch and the notification center where you get friendrequests or channelinvites. You can also start the matchmaking with the join button.
![homescreen](https://github.com/fsemke/42_transcendence_Copy/blob/master/readme/Screenshot%202023-12-07%20141803.png?raw=true)

## How does the .env file look like
DB_HOST='postgresql_database'<br>
DB_PORT=5432<br>
DB_USERNAME='user'<br>
DB_PASSWORD='password123'<br>
DB_NAME='postgres_db'<br>
DOMAIN='localhost'<br>
INTRA42_AUTH_ID='id'<br>
INTRA42_AUTH_SECRET='sectret'<br>
INTRA42_AUTH_CALLBACK_URL="http://${DOMAIN}/login"<br>
JWT_SECRET='ourJwtSecret'<br>
JWT_EXPIRES_IN='1500s'<br>
FOR_REAL_NO_BYPASS='thereisnobypass'

