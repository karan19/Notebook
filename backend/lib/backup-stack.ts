import * as cdk from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

interface NotebookBackupStackProps extends cdk.StackProps {
    resources: backup.BackupResource[];
}

export class NotebookBackupStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: NotebookBackupStackProps) {
        super(scope, id, props);

        // Create a Backup Vault
        const vault = new backup.BackupVault(this, 'NotebookBackupVault', {
            backupVaultName: 'NotebookBackupVault',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Create a Backup Plan
        const plan = new backup.BackupPlan(this, 'NotebookDailyBackupPlan', {
            backupPlanName: 'NotebookDailyBackupPlan',
        });

        // Add a rule to the plan
        plan.addRule(new backup.BackupPlanRule({
            ruleName: 'DailyBackup',
            backupVault: vault,
            // Daily at 05:00 UTC
            scheduleExpression: events.Schedule.cron({
                hour: '5',
                minute: '0',
            }),
            deleteAfter: cdk.Duration.days(30),
        }));

        // Assign resources to the plan
        plan.addSelection('NotebookResources', {
            resources: props.resources,
            allowRestores: true,
        });
    }
}
