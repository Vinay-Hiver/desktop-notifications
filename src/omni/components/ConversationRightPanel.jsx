import React from 'react';
import { ChannelRightPanel } from '../../patterns/RightPanel/ChannelRightPanel';
import { useConversationFields } from '../ConversationFields';
import { useCurrentUser } from '../CurrentUser';
import { TAGS } from '../data/tags';
import { CUSTOM_FIELDS } from '../data/customFields';
import { agentOptionsFor } from '../data/agents';


/** The storybook right panel, with the conversation's Assignee, Status, Tags and Custom fields kept per conversation. */
export default function ConversationRightPanel({ conversationId, ...panelProps }) {
  const { assigneeOf, setAssignee, statusOf, setStatus, setTags, customFieldsOf, setCustomField, tagsOf } = useConversationFields();
  const { user } = useCurrentUser();
  const id = conversationId != null ? String(conversationId) : undefined;

  const changeAssignee = (value) => { if (value !== assigneeOf(id)) setAssignee(id, value); };
  const changeStatus = (value) => { if (value !== statusOf(id)) setStatus(id, value); };
  const changeTags = (value) => setTags(id, value);
  const changeCustomField = (fieldId, value) => setCustomField(id, fieldId, value);

  return (
    <ChannelRightPanel
      {...panelProps}
      conversationId={id}
      people={agentOptionsFor(user.id)}
      assignee={id ? assigneeOf(id) : undefined}
      onAssigneeChange={id ? changeAssignee : undefined}
      status={id ? statusOf(id) : undefined}
      onStatusChange={id ? changeStatus : undefined}
      tagOptions={TAGS}
      tags={id ? tagsOf(id) : undefined}
      onTagsChange={id ? changeTags : undefined}
      customFields={id ? CUSTOM_FIELDS.map((f) => ({ ...f, value: customFieldsOf(id)[f.id] })) : undefined}
      onCustomFieldChange={id ? changeCustomField : undefined}
    />
  );
}
