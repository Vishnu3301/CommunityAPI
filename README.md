# Community Platform API

## About the project

---

Community platform API, as the name suggests is an API which resembles of a social media platform.

## What one can do?

---

So the basic work flow will be

1. New users can signup, already existing users can login
2. Users can create new posts, create groups, follow other users, all the above by getting a rewards in terms of points.
3. Users can comment on a post, reply to comment, like a comment/post
4. User can update their profiles

## Details functionalities

---

### Authentication and Authorization

---

- [x] User signup with an email, password and a unique username
- [x] User login with email and passowrd
- [x] User authorization with JWT
- [x] User can update his/her details such as mobile,profesion,location, name and with a username which is unique
- [x] User can update their Display and Background picture

### Posts

---

- [x] Create a post
- [x] Update a post
- [x] Delete a post
- [x] Archive a post
- [x] Unarchive a post
- [x] Get all posts created by the logged in user with pagination
- [x] Like a post
- [x] Dislike a post
- [x] Attach files to a post
- [x] Create both public and private posts

### Comments

---

- [x] Comment on a post
- [x] Update a comment
- [x] Delete a comment
- [x] Reply to a comment
- [x] Like a comment
- [x] Dislike a comment
- [x] Get all comments made by the logged in user with pagination

### Groups

---

- [x] Create a Group
- [x] Update details of the group
- [x] Get details of a group
- [x] Delete a group
- [x] Get one group's timeline
- [x] Join a group
- [x] Leave a group
- [x] Post in a group
- [x] Update the Display and background picture of the group (by the creator)
- [x] Get members of a group
- [x] Get a group's stats , member count, post count.

### Follows

---

- [x] Follow a user
- [x] Unfollow a user
- [x] Get followers of a user with pagination

### Users

---

- [x] Get a user's profile
- [x] Update user's profile
- [x] Get the posts,comments,likes, followers count of a user
- [x] Search for a user ny username, which is unique
- [x] Reset Password

### Timeline

---

- [x] Get the timeline for a logged in user with pagination

### Email Services

---

- [x] Email notifications when a user updates their profile -[x] Email Notification when a user follows/unfollows another user and
- [x] Email Notifications when a user like the post or comments on the post of another user
- [x] Email notification to all the followers of a user when he/she creates a post
- [x] Email Notifications when password reset occurs

### Incentive Mechanisms

---

- [x] Reward a user when he posts, comments, likes or follows an another user

> The number of reward points will differ based on the action

- [x] Debit reward for a negative action.

## Tech Stack

---

> - NodeJs
> - MongoDb
> - Firebase (For authentication)
> - RabbitMQ (message queuing and broker services)
> - Nodemailer (Email sending service, GMAIL SMTP SERVER)
> - Git and Github
> - GCP buckets (file storage services)
> - Postman

## Learnings

---

### **NodeJs**

- Nothing to something in NodeJs and Express
- Clear understanding of express middleware and basic implementation of custom error handling

### **MongoDb**

- Using Mongodb , A document based database for data storage and working with official NodeJs ,mongodb driver
- Working with aggregate in MongoDb

### **Message Queuing services**

- Learned RabbitMQ for implementig message queuing services which is used for carrying out work for Email and Reward services

### **Image upload and handling**

- Learned how to handle form-data with multer and upload the files to cloud storage on google cloud platfrom

### **Logging**

- winston-mongodb logger is employed to log the details of reward transactions into monogdb database

### **Others**

- Effective Communication, Confidence in self
- Best practices to follow while making API's
- Increased Enthusiam for Backend Development

### **WOW moments**

- Loved and absolutely taken away by the idea of **Message queuing** and the response lag it reduces

> Postman Collection can be found [here](https://interstellar-sunset-717797.postman.co/workspace/Community-api-LU~de1d6a5a-10c3-44be-915d-6cb8d94dae83/api/c3e6c6e5-1f25-429c-8bf1-613cf4b44a2f)

This project is a part of my internship at LetsUpgrade Labs.

### **Note Regarding file upload**

> Please create your own .env file in the root directory and replace the values below mentions with you own values

> MONGO_URL="your mongodb cluster url"

> DBNAME="your database name in your cluster

> LOGSDBNAME="database name in the cluster in which you want to store your log data"

> LOGSCOLLECTION="name of the collection of your logs"

> PORT= un-occupied port number of your choice
> APIKEY="firebase api key"

> AUTHDOMAIN=="concerned with your firebase project"
> PROJECTID="firebase project id"

> STORAGEBUCKET="firebase storage bucket name"

> MESSAGINGSENDERID ="firebase project related info"

> APPID="firebase app id"

> MEASUREMENTID="firebase project related ID"

> SERVICE="gmail"

> USEREMAIL="your email id"

> PASS="your email password"

> AMQPURL="your amqp cloud instace url"

> MAILINGQUEUE="mailingqueue"

> REWARDQUEUE="rewardqueue"

> BULKMAILINGQUEUE="bulkmailingqueue"

> SECRETKE="secret key for jwt encoding"

**_For the file Upload functionality to work, create a service key from your google console (google cloud platform account) and download it. Rename it to key.json_**
