import type { Prisma } from '@prisma/client';
import mqtt from 'mqtt';
import { handleMachineEvent, markStaleMachinesOffline, type MachineEventInput, type MachineEventType } from './machine-events.js';

let client: mqtt.MqttClient | null = null;
const MQTT_TOPIC_PREFIX = (process.env.MQTT_TOPIC_PREFIX || 'roboss').replace(/^\/+|\/+$/g, '');

type WashCommandType = 'start' | 'stop' | 'pause' | 'resume';
type MachineCommandType = 'restart' | 'maintenance_on' | 'maintenance_off';

interface LegacyStatusPayload {
  espDeviceId: string;
  status: 'idle' | 'washing' | 'maintenance' | 'offline';
  currentStep?: number;
  progress?: number;
  sessionId?: string;
  firmwareVersion?: string;
}

function mapLegacyStatusPayload(payload: LegacyStatusPayload): MachineEventInput {
  const statusToEvent: Record<LegacyStatusPayload['status'], MachineEventType> = {
    idle: payload.progress !== undefined && payload.progress >= 100 ? 'completed' : 'heartbeat',
    washing: payload.progress !== undefined || payload.currentStep !== undefined ? 'progress_updated' : 'washing_started',
    maintenance: 'maintenance',
    offline: 'offline',
  };

  return {
    type: statusToEvent[payload.status],
    espDeviceId: payload.espDeviceId,
    sessionId: payload.sessionId,
    machineStatus: payload.status,
    currentStep: payload.currentStep,
    progress: payload.progress,
    firmwareVersion: payload.firmwareVersion,
    rawPayload: payload as unknown as Prisma.InputJsonValue,
  };
}

function mapPayloadToMachineEvent(payload: Record<string, unknown>) {
  if (typeof payload.type === 'string') {
    return {
      type: payload.type as MachineEventType,
      machineId: typeof payload.machineId === 'string' ? payload.machineId : undefined,
      branchId: typeof payload.branchId === 'string' ? payload.branchId : undefined,
      espDeviceId: typeof payload.espDeviceId === 'string' ? payload.espDeviceId : undefined,
      sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : undefined,
      machineStatus: typeof payload.machineStatus === 'string' ? (payload.machineStatus as MachineEventInput['machineStatus']) : undefined,
      currentStep: typeof payload.currentStep === 'number' ? payload.currentStep : undefined,
      progress: typeof payload.progress === 'number' ? payload.progress : undefined,
      firmwareVersion: typeof payload.firmwareVersion === 'string' ? payload.firmwareVersion : undefined,
      reason: typeof payload.reason === 'string' ? payload.reason : undefined,
      errorCode: typeof payload.errorCode === 'string' ? payload.errorCode : undefined,
      occurredAt: typeof payload.occurredAt === 'string' ? payload.occurredAt : undefined,
      rawPayload: payload as unknown as Prisma.InputJsonValue,
    } satisfies MachineEventInput;
  }

  return mapLegacyStatusPayload(payload as unknown as LegacyStatusPayload);
}

async function handleIncomingMessage(topic: string, payload: Record<string, unknown>) {
  const escapedPrefix = MQTT_TOPIC_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const branchMatch = topic.match(new RegExp(`^${escapedPrefix}/([^/]+)/([^/]+)/(status|events)$`));
  const mapped = mapPayloadToMachineEvent(payload);

  if (branchMatch) {
    mapped.branchId = mapped.branchId ?? branchMatch[1];
    mapped.espDeviceId = mapped.espDeviceId ?? branchMatch[2];
  }

  await handleMachineEvent(mapped, 'mqtt');
}

export function initMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.log('MQTT_BROKER_URL not set - MQTT disabled');
    return;
  }

  client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('MQTT connected');
    client!.subscribe(
      [`${MQTT_TOPIC_PREFIX}/+/+/status`, `${MQTT_TOPIC_PREFIX}/+/+/events`],
      (err) => {
        if (err) console.error('MQTT subscribe error:', err);
        else console.log(`Subscribed to ${MQTT_TOPIC_PREFIX}/+/+/(status|events)`);
      }
    );
  });

  client.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString()) as Record<string, unknown>;
      await handleIncomingMessage(topic, payload);
    } catch (error) {
      console.error('MQTT message error:', error);
    }
  });

  client.on('error', (err) => console.error('MQTT error:', err));
  client.on('close', () => console.log('MQTT disconnected'));

  setInterval(async () => {
    await markStaleMachinesOffline();
  }, 60_000);
}

export function publishWashCommand(
  branchId: string,
  machineEspId: string,
  command: WashCommandType,
  payload: Record<string, unknown> = {}
) {
  if (!client?.connected) {
    console.warn('MQTT not connected - command not sent');
    return false;
  }

  const normalizedTopic = `${MQTT_TOPIC_PREFIX}/${branchId}/${machineEspId}/command`;
  client.publish(normalizedTopic, JSON.stringify({ command, ...payload, timestamp: Date.now() }));
  return true;
}

export function publishMachineCommand(
  branchId: string,
  machineEspId: string,
  command: MachineCommandType
) {
  if (!client?.connected) return false;

  const topic = `${MQTT_TOPIC_PREFIX}/${branchId}/${machineEspId}/manage`;
  client.publish(topic, JSON.stringify({ command, timestamp: Date.now() }));
  return true;
}

export function isMqttReady() {
  return Boolean(client?.connected);
}

export function getMqttClient() {
  return client;
}

export function getMqttTopicPrefix() {
  return MQTT_TOPIC_PREFIX;
}
