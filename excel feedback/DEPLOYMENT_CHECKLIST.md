# 🚀 DEPLOYMENT & PRODUCTION CHECKLIST

Use this checklist before deploying to production.

## Pre-Deployment Verification

### Code Quality
- [ ] All HTML files validate without errors
- [ ] All CSS is properly formatted
- [ ] All JavaScript functions are tested
- [ ] No console errors when running
- [ ] No console warnings about deprecated APIs
- [ ] All comments are clear and helpful

### Security
- [ ] Update Firestore security rules (paste from FIRESTORE_RULES.txt)
- [ ] Enable Firebase Auth only with Email/Password
- [ ] Review and restrict Firebase Realtime Database rules
- [ ] Set up Google Apps Script with proper permissions
- [ ] Verify CORS settings if hosting separately
- [ ] Remove all dummy/test accounts
- [ ] Change all "YOUR_*" placeholders to real values
- [ ] Review sensitive data handling

### Firebase Configuration
- [ ] Create production Firebase project (separate from dev)
- [ ] Configure Authentication settings
- [ ] Set up all three Collections in Firestore
- [ ] Enable automatic backups
- [ ] Set up Firestore indexes for queries
- [ ] Configure Firebase Hosting (if using)
- [ ] Set up Firebase Analytics

### Google Apps Script
- [ ] Deploy as Web App with "Execute as: You"
- [ ] Set "Who has access" to "Anyone"
- [ ] Test form creation functionality
- [ ] Verify sheet creation works
- [ ] Test form-to-sheet linking
- [ ] Monitor Apps Script quota usage

### Testing

#### Student Flow
- [ ] Sign up as student works
- [ ] Login/logout works
- [ ] Dashboard loads correctly
- [ ] Subjects display by semester
- [ ] Feedback form opens correctly
- [ ] Submission recorded successfully
- [ ] Status updates to "Submitted"
- [ ] Cannot submit twice

#### Faculty Flow
- [ ] Sign up as faculty works
- [ ] Login/logout works  
- [ ] Dashboard loads correctly
- [ ] Form creation succeeds
- [ ] Google Form created successfully
- [ ] Google Sheet created successfully
- [ ] Form and Sheet links work
- [ ] Sheet collects responses
- [ ] Download works
- [ ] Delete removes form

#### Admin Flow
- [ ] Sign up as admin works
- [ ] Can access admin dashboard
- [ ] View all subjects
- [ ] View all users
- [ ] Download reports
- [ ] Delete subjects/users works
- [ ] Data integrity maintained

### Performance
- [ ] Page load time < 3 seconds
- [ ] Form creation < 5 seconds
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Images optimized (if any)
- [ ] CSS files minified (optional)
- [ ] JavaScript files minified (optional)

### Browser Compatibility
- [ ] Chrome - Full functionality
- [ ] Firefox - Full functionality
- [ ] Safari - Full functionality
- [ ] Edge - Full functionality
- [ ] Mobile browsers - Responsive design works
- [ ] Tablet view - Layout adjusts correctly

### Data Integrity
- [ ] All timestamps recorded correctly
- [ ] Email addresses stored properly
- [ ] No duplicate entries in Firestore
- [ ] User IDs unique
- [ ] Subject IDs unique
- [ ] Form links are valid
- [ ] Sheet links are valid

---

## Production Environment Setup

### Web Hosting

#### Option 1: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

#### Option 2: Shared Hosting
- Upload files to public_html directory
- Ensure HTTPS is enabled
- Set proper file permissions

#### Option 3: Cloud Server
- Deploy to AWS/GCP/Azure
- Configure web server (Nginx/Apache)
- Set up SSL certificates

### Domain Setup
- [ ] Purchase domain name
- [ ] Configure DNS records
- [ ] Set up SSL certificate
- [ ] Configure email forwarding

### Backup & Recovery
- [ ] Set up Firestore exports
- [ ] Configure automated backups
- [ ] Document recovery procedures
- [ ] Store backups in secure location
- [ ] Test backup restoration

### Monitoring & Logging
- [ ] Enable Firebase monitoring
- [ ] Set up error reporting
- [ ] Configure access logs
- [ ] Monitor database usage
- [ ] Alert on quota limits
- [ ] Track user sessions

### User Management
- [ ] Create admin account
- [ ] Add faculty accounts
- [ ] Create test student accounts
- [ ] Document password reset procedure
- [ ] Set up admin verification process
- [ ] Create user guidelines document

---

## Post-Deployment Tasks

### Initial Launch
- [ ] Announce system to users
- [ ] Provide user documentation links
- [ ] Setup support email/contact
- [ ] Monitor for issues first 24 hours
- [ ] Be ready to troubleshoot

### Training
- [ ] Train admins on system
- [ ] Train faculty on form creation
- [ ] Provide student guide
- [ ] Create video tutorials (optional)
- [ ] Document common questions

### Monitoring (Daily)
- [ ] Check error reports
- [ ] Monitor database quotas
- [ ] Verify backups completed
- [ ] Review user feedback
- [ ] Check system performance

### Maintenance (Weekly)
- [ ] Review Firestore logs
- [ ] Optimize database queries if needed
- [ ] Check for security issues
- [ ] Update documentation
- [ ] Monitor disk space usage

### Maintenance (Monthly)
- [ ] Full system backup
- [ ] Security audit
- [ ] Performance review
- [ ] Update user base
- [ ] Plan upgrades/improvements

---

## Scalability Considerations

### Current Limits
- Firestore: 25,000 reads/writes per day (free tier)
- Google Forms: Unlimited responses
- Google Sheets: 10 million cells per sheet
- Firebase Auth: 200,000+ users (free tier)

### For Growth
- [ ] Plan Firestore upgrade path
- [ ] Consider caching layer
- [ ] Monitor and optimize queries
- [ ] Plan database sharding if needed
- [ ] Set up CDN for static assets
- [ ] Consider API optimization

---

## Security Audit Checklist

- [ ] All user input is validated
- [ ] SQL injection impossible (using Firestore)
- [ ] XSS protection via escaping
- [ ] CSRF tokens (not needed for REST APIs)
- [ ] Password requirements enforced
- [ ] HTTPS enabled everywhere
- [ ] Sensitive data not logged
- [ ] API keys not exposed in frontend code
- [ ] Firebase rules tested
- [ ] Error messages don't reveal system details
- [ ] Authentication tokens properly handled
- [ ] Rate limiting configured (if applicable)

---

## Documentation for Users

- [ ] User manual created
- [ ] FAQ document
- [ ] Video tutorials
- [ ] Admin guide
- [ ] Faculty guide
- [ ] Student guide
- [ ] Troubleshooting guide
- [ ] API documentation (if applicable)
- [ ] System architecture diagram
- [ ] Data flow diagram

---

## Go-Live Sign-Off

- [ ] QA testing complete: _____ (Date)
- [ ] Security review complete: _____ (Date)
- [ ] Performance testing complete: _____ (Date)
- [ ] Documentation finalized: _____ (Date)
- [ ] Stakeholders approved: _____ (Date)
- [ ] Technical lead approval: _____ (Date)

**Approved for production deployment on**: _______________

**Deployed by**: _______________

**Deployment date**: _______________

---

## Rollback Plan

**If critical issues occur:**

1. Stop new user creation
2. Revert to previous Firebase/Firestore snapshot
3. Notify all users of downtime
4. Restore from backup
5. Test thoroughly
6. Communicate fix to users
7. Resume operations

**Rollback contact**: _______________

**Escalation contact**: _______________

---

## Notes for Future Maintainers

_Use this space to document any decisions, issues, or important information for future team members._

```
[Your notes here]
```

---

**Last Updated**: _______________

**Next Review Date**: _______________

**Maintained By**: _______________
