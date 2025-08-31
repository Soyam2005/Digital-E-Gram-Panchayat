# E-Gram Panchayat - Digital Village Governance System

A comprehensive web application for digital governance in gram panchayats, enabling citizens to apply for government services online and allowing officials to manage applications efficiently.

## 🎯 Project Overview

The E-Gram Panchayat system aims to improve the delivery of citizen services in villages by computerizing applications for gram panchayat services. It provides a decentralized platform where citizens can apply for various government services and track their application status, while officials can manage and process these applications efficiently.

## ✨ Features

### 👥 Citizen Features

- **User Registration & Login**: Secure authentication system
- **Search Services**: Browse and search available government services
- **Apply for Services**: Submit applications for various government schemes
- **Track Applications**: Monitor application status and progress
- **Profile Management**: Update personal information and view account details

### 👨‍💼 Officer Features

- **Service Management**: Create, update, and delete government services
- **Application Processing**: Review and update application status
- **Dashboard Analytics**: View system statistics and reports
- **User Management**: Oversee citizen accounts and applications

### 👨‍💻 Staff Features

- **View Services**: Access information about available services
- **Application Processing**: Update application status and add comments
- **Dashboard Overview**: Monitor pending applications and daily statistics

## 🏗️ System Architecture

### Frontend

- **HTML5**: Semantic markup for accessibility
- **CSS3**: Modern styling with Bootstrap 5 framework
- **JavaScript (ES6+)**: Modular JavaScript with ES6 modules
- **Bootstrap 5**: Responsive design framework

### Backend & Database

- **Firebase Authentication**: Secure user authentication
- **Firebase Firestore**: NoSQL cloud database
- **Firebase Hosting**: Cloud hosting platform

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project with Authentication and Firestore enabled
- Basic knowledge of HTML, CSS, and JavaScript

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd e-gram-panchayat
   ```

2. **Configure Firebase**

   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Update the Firebase configuration in `js/firebase/secret.js`

3. **Firebase Configuration**

   ```javascript
   // js/firebase/secret.js
   export const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id",
   };
   ```

4. **Set up Firestore Security Rules**

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       // Applications - users can read their own, officers/staff can read all
       match /applications/{applicationId} {
         allow read: if request.auth != null &&
           (resource.data.userId == request.auth.uid ||
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['officer', 'staff']);
         allow write: if request.auth != null;
       }

       // Services - officers can manage, others can read active services
       match /services/{serviceId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null &&
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'officer';
       }
     }
   }
   ```

5. **Run the Application**

   - Open `index.html` in a web browser
   - Or use a local server:

     ```bash
     # Using Python
     python -m http.server 8000

     # Using Node.js
     npx serve .

     # Using PHP
     php -S localhost:8000
     ```

## 📁 Project Structure

```
e-gram-panchayat/
├── index.html                 # Main landing page
├── register.html             # User registration page
├── citizen-dashboard.html    # Citizen dashboard
├── officer-dashboard.html    # Officer dashboard
├── staff-dashboard.html      # Staff dashboard
├── css/
│   └── style.css            # Custom styles
├── js/
│   ├── main.js              # Main application logic
│   ├── auth/
│   │   ├── login.js         # Authentication functions
│   │   └── register.js      # Registration functions
│   ├── citizen/
│   │   └── citizen-dashboard.js
│   ├── officer/
│   │   └── officer-dashboard.js
│   ├── staff/
│   │   └── staff-dashboard.js
│   ├── firebase/
│   │   ├── firebase-config.js
│   │   └── secret.js        # Firebase configuration
│   └── utils/
│       └── alerts.js        # Alert utility functions
└── assets/                  # Images and other assets
```

## 🔐 User Roles & Permissions

### Citizen

- Register and login
- Search and apply for services
- Track application status
- Manage profile information

### Staff

- Login with staff credentials
- View available services
- Update application status
- View application details

### Officer

- Login with officer credentials
- Create, edit, and delete services
- Manage all applications
- View system reports and analytics

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern Interface**: Clean, intuitive design using Bootstrap 5
- **Real-time Updates**: Live status updates and notifications
- **Accessibility**: WCAG compliant design elements
- **Loading States**: Visual feedback during data operations

## 🔧 Customization

### Adding New Services

Officers can add new services through the dashboard with:

- Service name and description
- Category classification
- Processing time and fees
- Required documents
- Eligibility criteria

### Modifying User Roles

Update the role-based access control in the authentication system to add new roles or modify permissions.

## 🚨 Security Features

- **Firebase Authentication**: Secure user authentication
- **Role-based Access Control**: Different permissions for different user types
- **Input Validation**: Client and server-side validation
- **Secure Database Rules**: Firestore security rules
- **Session Management**: Secure session handling

## 📊 Database Schema

### Users Collection

```javascript
{
  uid: "user-id",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "1234567890",
  village: "Village Name",
  district: "District Name",
  state: "State Name",
  pincode: "123456",
  address: "Complete Address",
  aadhar: "123456789012",
  role: "citizen|staff|officer",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### Services Collection

```javascript
{
  name: "Service Name",
  category: "certificates|property|schemes|utilities|other",
  description: "Service description",
  processingTime: 7,
  fee: 100.00,
  requiredDocuments: "Document 1, Document 2",
  eligibilityCriteria: "Eligibility requirements",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### Applications Collection

```javascript
{
  userId: "user-id",
  serviceId: "service-id",
  serviceName: "Service Name",
  reason: "Application reason",
  notes: "Additional notes",
  status: "pending|approved|rejected",
  comments: "Officer comments",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Error**

   - Verify Firebase configuration in `secret.js`
   - Check internet connection
   - Ensure Firebase project is active

2. **Authentication Issues**

   - Clear browser cache and cookies
   - Check Firebase Authentication settings
   - Verify email/password format

3. **Database Access Denied**
   - Review Firestore security rules
   - Check user role permissions
   - Verify user authentication status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with basic functionality
- **v1.1.0** - Added service management features
- **v1.2.0** - Enhanced UI/UX and security features

---

**Note**: This is a demonstration project. For production use, ensure proper security measures, data validation, and compliance with local government regulations.
