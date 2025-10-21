"""
Database initialization script for SmartNotes AI
Run this file to create database tables and optionally create a test user.
"""
from app import app
from models import db, User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize the database and create all tables"""
    try:
        with app.app_context():
            logger.info("Creating database tables...")
            
            # Create all tables
            db.create_all()
            
            logger.info("✓ Database tables created successfully!")
            
            # Check if any users exist
            user_count = User.query.count()
            
            if user_count == 0:
                logger.info("\nNo users found. Creating test admin user...")
                
                # Create test admin user
                test_user = User(
                    username='admin',
                    email='admin@smartnotes.com'
                )
                test_user.set_password('admin123')
                
                db.session.add(test_user)
                db.session.commit()
                
                logger.info("✓ Test admin user created successfully!")
                logger.info("=" * 50)
                logger.info("TEST USER CREDENTIALS:")
                logger.info("  Username: admin")
                logger.info("  Email: admin@smartnotes.com")
                logger.info("  Password: admin123")
                logger.info("=" * 50)
                logger.info("\nYou can now:")
                logger.info("1. Run 'python app.py' to start the server")
                logger.info("2. Visit http://localhost:5000/login")
                logger.info("3. Login with the admin credentials above")
                logger.info("4. Or register a new account at http://localhost:5000/register")
            else:
                logger.info(f"\n✓ Database already contains {user_count} user(s)")
                logger.info("Ready to start the application!")
            
            return True
            
    except Exception as e:
        logger.error(f"✗ Error initializing database: {e}")
        return False

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("SmartNotes AI - Database Initialization")
    print("=" * 50 + "\n")
    
    success = init_database()
    
    if success:
        print("\n✓ Database initialization completed successfully!\n")
    else:
        print("\n✗ Database initialization failed. Check the errors above.\n")