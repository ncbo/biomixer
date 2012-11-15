package org.thechiselgroup.biomixer.client.services.ontology_overview;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class TotalMappingCount implements Iterable<OntologyMappingCount> {

    private List<OntologyMappingCount> ontologyMappingCounts = new ArrayList<OntologyMappingCount>();

    public void add(OntologyMappingCount ontologyMappingCount) {
        ontologyMappingCounts.add(ontologyMappingCount);
    }

    public int getMappingCount(String id1, String id2) {
        int count = 0;

        for (OntologyMappingCount ontologyMappingCount : ontologyMappingCounts) {
            if (ontologyMappingCount.getSourceId().equals(id1)
                    && ontologyMappingCount.getTargetId().equals(id2)) {
                count += ontologyMappingCount.getCount();
            }
            if (ontologyMappingCount.getSourceId().equals(id2)
                    && ontologyMappingCount.getTargetId().equals(id1)) {
                count += ontologyMappingCount.getCount();
            }
        }

        return count;
    }

    @Override
    public Iterator<OntologyMappingCount> iterator() {
        return ontologyMappingCounts.iterator();
    }

    public int size() {
        return ontologyMappingCounts.size();
    }

}
