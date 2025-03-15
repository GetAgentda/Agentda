"use client";

import React from 'react';
import styles from '../app/page.module.css';
import Button from './Button';
import Card from './Card';

export default function HomeContent() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Welcome to Agentda</h1>
        <p className={styles.description}>
          Your AI-powered task management assistant
        </p>
        
        <div className={styles.grid}>
          <Card title="Get Started" variant="elevated">
            <p>Begin organizing your tasks with Agentda's powerful AI features.</p>
            <div className={styles.cardActions}>
              <Button variant="primary">Create Account</Button>
            </div>
          </Card>
          
          <Card title="Features" variant="default">
            <p>Discover what makes Agentda different from other task managers.</p>
            <div className={styles.cardActions}>
              <Button variant="secondary">Learn More</Button>
            </div>
          </Card>
          
          <Card title="Pricing" variant="flat">
            <p>Find a plan that suits your needs, from free to enterprise.</p>
            <div className={styles.cardActions}>
              <Button variant="secondary" size="small">View Plans</Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
} 